import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@app/database';
import { ChainService } from '@app/blockchain';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from '@app/notifications';
import { QUEUE_NAMES, RebalanceJobData } from '@app/queue/types';
import { StrategyEngineService } from '../strategy/strategy-engine.service';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);
  private isMonitoring = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsGateway,
    private readonly strategyEngine: StrategyEngineService,
    @InjectQueue(QUEUE_NAMES.REBALANCE) private readonly rebalanceQueue: Queue,
  ) {}

  /**
   * Monitor all active strategies every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorStrategies() {
    if (this.isMonitoring) {
      this.logger.debug('Previous monitoring cycle still running, skipping...');
      return;
    }

    this.isMonitoring = true;

    try {
      this.logger.debug('Starting strategy monitoring cycle');

      // Get all active strategies with delegatorAddress (no delegation required)
      const strategies = await this.prisma.strategy.findMany({
        where: {
          isActive: true,
          isDeployed: true, // CRITICAL: Only monitor strategies that are deployed on-chain
          delegatorAddress: {
            not: null, // Only monitor strategies with DeleGator smart contract
          },
        },
        include: {
          user: true,
          rebalances: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      this.logger.log(`Monitoring ${strategies.length} active strategies`);

      for (const strategy of strategies) {
        await this.checkStrategy(strategy);
      }

      this.logger.debug('Monitoring cycle completed');
    } catch (error) {
      this.logger.error(`Monitoring error: ${error.message}`, error.stack);
    } finally {
      this.isMonitoring = false;
    }
  }

  /**
   * Check if a strategy needs rebalancing
   */
  private async checkStrategy(strategy: any) {
    try {
      this.logger.debug(`🔍 Checking strategy ${strategy.id}...`);

      // Check if strategy has strategyLogic
      if (!strategy.strategyLogic) {
        this.logger.warn(
          `Strategy ${strategy.id} has no strategyLogic, skipping...`,
        );
        return;
      }

      // Check if rebalance interval has passed
      const lastRebalance = strategy.rebalances[0]?.createdAt || strategy.createdAt;
      const timeSinceLastRebalance = Date.now() - lastRebalance.getTime();
      const intervalMs = Number(strategy.rebalanceInterval) * 1000;

      this.logger.debug(
        `Strategy ${strategy.id}: timeSinceLastRebalance=${Math.floor(timeSinceLastRebalance / 1000)}s, intervalMs=${intervalMs / 1000}s, lastRebalance=${lastRebalance.toISOString()}`,
      );

      if (timeSinceLastRebalance < intervalMs) {
        this.logger.debug(
          `Strategy ${strategy.id}: Not yet time to rebalance (${Math.floor((intervalMs - timeSinceLastRebalance) / 1000)}s remaining)`,
        );
        return; // Not yet time to rebalance
      }

      // Use StrategyEngine to check if rebalancing is needed
      const rebalanceCheck = await this.strategyEngine.needsRebalancing(
        strategy.strategyLogic,
        strategy,
      );

      if (!rebalanceCheck.needs) {
        this.logger.debug(
          `Strategy ${strategy.id}: ${rebalanceCheck.reason}`,
        );
        return;
      }

      this.logger.log(
        `Strategy ${strategy.id} needs rebalancing: ${rebalanceCheck.reason}`,
      );

      // Add to rebalance queue
      await this.queueRebalance(strategy, rebalanceCheck.drift);
    } catch (error) {
      this.logger.error(
        `Error checking strategy ${strategy.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Queue a rebalance job
   */
  private async queueRebalance(strategy: any, drift: number) {
    const jobData: RebalanceJobData = {
      strategyId: strategy.id,
      userAddress: strategy.userAddress,
      chainId: strategy.chainId,
      drift,
      priority: drift > 1000 ? 'high' : drift > 500 ? 'medium' : 'low',
    };

    await this.rebalanceQueue.add('execute-rebalance', jobData, {
      priority: jobData.priority === 'high' ? 1 : jobData.priority === 'medium' ? 5 : 10,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    // Notify user via WebSocket
    this.notifications.emitRebalanceStarted(strategy.userAddress, {
      strategyId: strategy.id,
      drift: drift / 100, // Convert to percentage
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Queued rebalance for strategy ${strategy.id} with priority ${jobData.priority}`);
  }

  /**
   * Health check - run every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheck() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      // Check queue health
      const queueHealth = await this.rebalanceQueue.getJobCounts();

      this.logger.log(
        `Health check passed - Queue: ${JSON.stringify(queueHealth)}`,
      );

      // TODO: Check blockchain RPC connectivity
      // TODO: Check gas oracle availability
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);

      // Notify admin via notifications
      this.notifications.broadcastSystemMessage('Bot worker health check failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

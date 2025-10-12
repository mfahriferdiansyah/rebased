import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@app/database';
import { NotificationsGateway } from '@app/notifications';
import { QUEUE_NAMES, IndexerJobData } from '@app/queue/types';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor(QUEUE_NAMES.INDEXER)
export class EventProcessor {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsGateway,
    @InjectQueue(QUEUE_NAMES.ANALYTICS) private readonly analyticsQueue: Queue,
  ) {}

  /**
   * Process blockchain events
   */
  @Process('process-event')
  async handleEvent(job: Job<IndexerJobData>) {
    const { chainId, eventName, blockNumber, transactionHash, data } = job.data;

    this.logger.log(
      `Processing ${eventName} event from chain ${chainId} (block ${blockNumber})`,
    );

    try {
      switch (eventName) {
        case 'StrategyCreated':
          await this.handleStrategyCreated(data, chainId, transactionHash);
          break;

        case 'StrategyUpdated':
          await this.handleStrategyUpdated(data, chainId, transactionHash);
          break;

        case 'StrategyDeactivated':
          await this.handleStrategyDeactivated(data, chainId, transactionHash);
          break;

        case 'DelegationCreated':
          await this.handleDelegationCreated(data, chainId, transactionHash);
          break;

        case 'DelegationRevoked':
          await this.handleDelegationRevoked(data, chainId, transactionHash);
          break;

        case 'RebalanceExecuted':
          await this.handleRebalanceExecuted(data, chainId, transactionHash);
          break;

        case 'RebalanceFailed':
          await this.handleRebalanceFailed(data, chainId, transactionHash);
          break;

        default:
          this.logger.warn(`Unknown event type: ${eventName}`);
      }

      // Queue analytics update
      await this.analyticsQueue.add('update-analytics', {
        eventName,
        chainId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Error processing ${eventName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle StrategyCreated event
   */
  private async handleStrategyCreated(data: any, chainId: number, txHash: string) {
    const { strategyId, user, tokens, weights, rebalanceInterval } = data;

    await this.prisma.strategy.upsert({
      where: {
        userAddress_strategyId_chainId: {
          userAddress: user.toLowerCase(),
          strategyId: BigInt(strategyId),
          chainId,
        },
      },
      create: {
        chainId,
        strategyId: BigInt(strategyId),
        userAddress: user.toLowerCase(),
        tokens: tokens.map((t: string) => t.toLowerCase()),
        weights,
        rebalanceInterval: BigInt(rebalanceInterval),
        isActive: true,
      },
      update: {},
    });

    this.notifications.broadcastSystemMessage('New strategy created', {
      strategyId: strategyId.toString(),
      user,
      chainId,
    });

    this.logger.log(`Indexed StrategyCreated: ${strategyId} for ${user}`);
  }

  /**
   * Handle StrategyUpdated event
   */
  private async handleStrategyUpdated(data: any, chainId: number, txHash: string) {
    const { strategyId, weights, rebalanceInterval } = data;

    await this.prisma.strategy.updateMany({
      where: {
        strategyId: BigInt(strategyId),
        chainId,
      },
      data: {
        weights,
        rebalanceInterval: BigInt(rebalanceInterval),
      },
    });

    this.logger.log(`Indexed StrategyUpdated: ${strategyId}`);
  }

  /**
   * Handle StrategyDeactivated event
   */
  private async handleStrategyDeactivated(data: any, chainId: number, txHash: string) {
    const { strategyId } = data;

    await this.prisma.strategy.updateMany({
      where: {
        strategyId: BigInt(strategyId),
        chainId,
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Indexed StrategyDeactivated: ${strategyId}`);
  }

  /**
   * Handle DelegationCreated event
   */
  private async handleDelegationCreated(data: any, chainId: number, txHash: string) {
    const { delegationHash, user, delegate, strategyId } = data;

    // Find the strategy
    const strategy = await this.prisma.strategy.findFirst({
      where: {
        strategyId: BigInt(strategyId),
        chainId,
        userAddress: user.toLowerCase(),
      },
    });

    if (strategy) {
      await this.prisma.delegation.upsert({
        where: { id: delegationHash },
        create: {
          id: delegationHash,
          chainId,
          strategyId: strategy.id,
          userAddress: user.toLowerCase(),
          delegateAddress: delegate.toLowerCase(),
          delegationData: data,
          signature: data.signature || '',
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });

      this.logger.log(`Indexed DelegationCreated: ${delegationHash}`);
    }
  }

  /**
   * Handle DelegationRevoked event
   */
  private async handleDelegationRevoked(data: any, chainId: number, txHash: string) {
    const { delegationHash } = data;

    await this.prisma.delegation.update({
      where: { id: delegationHash },
      data: { isActive: false },
    });

    this.logger.log(`Indexed DelegationRevoked: ${delegationHash}`);
  }

  /**
   * Handle RebalanceExecuted event
   */
  private async handleRebalanceExecuted(data: any, chainId: number, txHash: string) {
    const { strategyId, drift, gasUsed, executor } = data;

    // Find the strategy
    const strategy = await this.prisma.strategy.findFirst({
      where: {
        strategyId: BigInt(strategyId),
        chainId,
      },
    });

    if (strategy) {
      await this.prisma.rebalance.create({
        data: {
          strategyId: strategy.id,
          chainId,
          txHash,
          drift: BigInt(drift),
          gasUsed: BigInt(gasUsed),
          gasPrice: 0n, // TODO: Get from transaction receipt
          status: 'SUCCESS',
          executedAt: new Date(),
        },
      });

      // Notify user via WebSocket
      this.notifications.emitRebalanceCompleted(strategy.userAddress, {
        strategyId: strategy.id,
        txHash,
        drift: Number(drift) / 100,
        gasUsed: gasUsed.toString(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Indexed RebalanceExecuted: ${strategyId} (tx: ${txHash})`);
    }
  }

  /**
   * Handle RebalanceFailed event
   */
  private async handleRebalanceFailed(data: any, chainId: number, txHash: string) {
    const { strategyId, reason } = data;

    // Find the strategy
    const strategy = await this.prisma.strategy.findFirst({
      where: {
        strategyId: BigInt(strategyId),
        chainId,
      },
    });

    if (strategy) {
      await this.prisma.rebalance.create({
        data: {
          strategyId: strategy.id,
          chainId,
          txHash: txHash || '',
          drift: 0n,
          gasUsed: 0n,
          gasPrice: 0n,
          status: 'FAILED',
          error: reason,
          executedAt: new Date(),
        },
      });

      // Notify user of failure
      this.notifications.emitRebalanceCompleted(strategy.userAddress, {
        strategyId: strategy.id,
        success: false,
        error: reason,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Indexed RebalanceFailed: ${strategyId}`);
    }
  }
}

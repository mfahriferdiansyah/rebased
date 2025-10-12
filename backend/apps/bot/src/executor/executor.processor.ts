import { Processor, Process, OnQueueError, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@app/database';
import { ChainService } from '@app/blockchain';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from '@app/notifications';
import { QUEUE_NAMES, RebalanceJobData } from '@app/queue/types';
import { DexService } from '../dex/dex.service';
import { GasService } from '../gas/gas.service';
import { MevService } from '../mev/mev.service';
import { StrategyEngineService } from '../strategy/strategy-engine.service';

@Processor(QUEUE_NAMES.REBALANCE)
export class ExecutorProcessor {
  private readonly logger = new Logger(ExecutorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsGateway,
    private readonly strategyEngine: StrategyEngineService,
    private readonly dex: DexService,
    private readonly gas: GasService,
    private readonly mev: MevService,
  ) {}

  /**
   * Process rebalance job
   */
  @Process('execute-rebalance')
  async handleRebalance(job: Job<RebalanceJobData>) {
    const { strategyId, userAddress, chainId, drift } = job.data;

    this.logger.log(
      `Processing rebalance job ${job.id} for strategy ${strategyId} (drift: ${drift / 100}%)`,
    );

    try {
      // 1. Get strategy details
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: strategyId },
        include: {
          user: true,
          delegations: {
            where: { isActive: true },
            take: 1,
          },
        },
      });

      if (!strategy || !strategy.delegations.length) {
        throw new Error('Strategy not found or no active delegation');
      }

      if (!strategy.strategyLogic) {
        throw new Error('Strategy has no strategyLogic');
      }

      // 2. Evaluate strategy and generate execution plan
      const evaluation = await this.strategyEngine.evaluateStrategy(
        strategy.strategyLogic,
        strategy,
      );

      if (!evaluation) {
        throw new Error('Failed to evaluate strategy');
      }

      if (!evaluation.shouldExecute) {
        this.logger.warn(`Strategy ${strategyId}: ${evaluation.reason}`);
        return; // Skip execution
      }

      this.logger.log(
        `Executing strategy ${strategyId}:\n${evaluation.portfolioSummary}\n${evaluation.conditionSummary}`,
      );

      // 3. Check gas price
      const chainName = chainId === 10143 ? 'monad' : 'base';
      const gasPrice = await this.gas.getOptimalGasPrice(chainName);
      const maxGasPrice = this.config.get<bigint>('bot.maxGasPrice', 100000000000n);

      if (gasPrice > maxGasPrice) {
        this.logger.warn(
          `Gas price too high (${gasPrice}), postponing rebalance`,
        );
        throw new Error('Gas price too high');
      }

      // 4. Get optimal swap routes from DEX aggregators
      const swaps = await this.dex.getOptimalSwaps(
        evaluation.executionPlan,
        chainName,
      );

      // 5. Prepare rebalance transaction
      const client = this.chain.getWalletClient(chainName);
      const executorAddress = this.config.get(
        `blockchain.${chainName}.contracts.delegateExecutor`,
      );

      // 6. Apply MEV protection
      const protectedTx = await this.mev.protectTransaction(
        {
          to: executorAddress as `0x${string}`,
          data: this.encodeRebalanceCall(evaluation.executionPlan, swaps),
          gas: evaluation.executionPlan.estimatedGas,
          maxFeePerGas: gasPrice,
          maxPriorityFeePerGas: gasPrice / 10n,
        },
        chainName,
      );

      // 7. Send transaction
      const txHash = await client.sendTransaction(protectedTx);

      this.logger.log(`Rebalance transaction sent: ${txHash}`);

      // 7. Wait for confirmation
      const publicClient = this.chain.getPublicClient(chainName);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        // 8. Save rebalance record
        await this.prisma.rebalance.create({
          data: {
            strategyId,
            chainId,
            txHash,
            drift: BigInt(drift),
            gasUsed: receipt.gasUsed,
            gasPrice: receipt.effectiveGasPrice,
            status: 'SUCCESS',
            executedAt: new Date(),
          },
        });

        // 9. Notify user
        this.notifications.emitRebalanceCompleted(userAddress, {
          strategyId,
          txHash,
          drift: drift / 100,
          gasUsed: receipt.gasUsed.toString(),
          timestamp: new Date().toISOString(),
        });

        this.logger.log(`Rebalance completed successfully: ${txHash}`);
      } else {
        throw new Error(`Transaction reverted: ${txHash}`);
      }
    } catch (error) {
      this.logger.error(
        `Rebalance failed for strategy ${strategyId}: ${error.message}`,
        error.stack,
      );

      // Save failed rebalance
      await this.prisma.rebalance.create({
        data: {
          strategyId,
          chainId,
          txHash: '',
          drift: BigInt(drift),
          gasUsed: 0n,
          gasPrice: 0n,
          status: 'FAILED',
          error: error.message,
          executedAt: new Date(),
        },
      });

      // Notify user of failure
      this.notifications.emitRebalanceCompleted(userAddress, {
        strategyId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error; // Re-throw for Bull retry mechanism
    }
  }

  /**
   * Encode rebalance call data for DelegateExecutor
   */
  private encodeRebalanceCall(executionPlan: any, swaps: any[]): `0x${string}` {
    // TODO: Use viem's encodeFunctionData with DelegateExecutor ABI
    // This should encode the actual swaps from executionPlan.swaps
    // with DEX routes from the swaps parameter
    return '0x' as `0x${string}`;
  }

  /**
   * Handle queue errors
   */
  @OnQueueError()
  onError(error: Error) {
    this.logger.error(`Queue error: ${error.message}`, error.stack);
  }

  /**
   * Handle failed jobs
   */
  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );

    // Notify system admin
    this.notifications.broadcastSystemMessage('Rebalance job failed', {
      jobId: job.id,
      strategyId: job.data.strategyId,
      error: error.message,
      attempts: job.attemptsMade,
    });
  }
}

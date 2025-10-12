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
import { encodeAbiParameters, parseAbiParameters, encodeFunctionData } from 'viem';
import { RebalanceExecutorABI } from '../contracts/abis';
import { CONTRACTS } from '../contracts/addresses';

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

      // 4. Get delegation
      const delegation = strategy.delegations[0];
      if (!delegation) {
        throw new Error('No active delegation found');
      }

      // 5. Get optimal swap routes from DEX aggregators
      const swaps = await this.dex.getOptimalSwaps(
        evaluation.executionPlan,
        chainName,
      );

      // 6. Build rebalance transaction args
      const { to, args } = await this.buildRebalanceArgs(
        strategy,
        delegation,
        swaps,
        chainName,
      );

      // 7. Get wallet client
      const walletClient = this.chain.getWalletClient(chainName);
      const publicClient = this.chain.getPublicClient(chainName);

      this.logger.log(`Calling RebalanceExecutor.rebalance() at ${to}`);

      // 8. Simulate contract call first
      const { request } = await publicClient.simulateContract({
        address: to,
        abi: RebalanceExecutorABI,
        functionName: 'rebalance',
        args,
        value: 0n,
        account: walletClient.account,
      });

      this.logger.log('Simulation successful, sending transaction...');

      // 9. Send transaction
      const txHash = await walletClient.writeContract(request);

      this.logger.log(`Rebalance transaction sent: ${txHash}`);

      // 10. Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        // 8. Save rebalance record
        const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;
        const botAddress = walletClient.account.address;

        await this.prisma.rebalance.create({
          data: {
            strategyId,
            chainId,
            txHash,
            userAddress,
            drift: BigInt(drift),
            gasUsed: receipt.gasUsed,
            gasPrice: receipt.effectiveGasPrice,
            gasCost,
            swapsExecuted: swaps.length,
            status: 'SUCCESS',
            executedBy: botAddress,
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
      const botWalletClient = this.chain.getWalletClient(chainName);
      const botAddress = botWalletClient.account.address;

      await this.prisma.rebalance.create({
        data: {
          strategyId,
          chainId,
          txHash: '',
          userAddress,
          drift: BigInt(drift),
          gasUsed: 0n,
          gasPrice: 0n,
          gasCost: 0n,
          swapsExecuted: 0,
          status: 'FAILED',
          errorMessage: error.message,
          executedBy: botAddress,
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
   * Build rebalance transaction arguments
   * Encodes delegation and swap data for RebalanceExecutor.rebalance()
   */
  private async buildRebalanceArgs(
    strategy: any,
    delegation: any,
    swaps: any[],
    chainName: 'monad' | 'base',
  ): Promise<{
    args: any[];
    to: `0x${string}`;
  }> {
    const userAccount = strategy.userAddress as `0x${string}`;
    const strategyId = BigInt(strategy.strategyId);

    // 1. Encode delegation as permissionContext
    const delegationData = delegation.delegationData;

    // Build caveat array with proper structure
    const caveats = (delegationData.caveats || []).map((c: any) => [
      c.enforcer as `0x${string}`,
      c.terms as `0x${string}`,
      c.args || ('0x' as `0x${string}`),
    ]);

    const permissionContext = encodeAbiParameters(
      parseAbiParameters('(address,address,bytes32,(address,bytes,bytes)[],uint256,bytes)'),
      [
        [
          delegationData.delegate as `0x${string}`,
          userAccount,
          (delegationData.authority || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
          caveats,
          BigInt(delegationData.salt || 0),
          delegation.signature as `0x${string}`,
        ],
      ],
    );

    // 2. Build swap data arrays
    const swapTargets: `0x${string}`[] = swaps.map((s) => s.target as `0x${string}`);
    const swapCallDatas: `0x${string}`[] = swaps.map((s) => s.data as `0x${string}`);
    const minOutputAmounts: bigint[] = swaps.map((s) => BigInt(s.minOutput || 0));

    // 3. Execution mode (SingleDefault = 0)
    const MODE_SINGLE_DEFAULT =
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

    // 4. Get executor address
    const executorAddress = CONTRACTS[chainName].executor;

    return {
      to: executorAddress,
      args: [
        userAccount,
        strategyId,
        swapTargets,
        swapCallDatas,
        minOutputAmounts,
        [permissionContext],
        [MODE_SINGLE_DEFAULT],
      ],
    };
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

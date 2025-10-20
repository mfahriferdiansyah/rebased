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
    const chainName = chainId === 10143 ? 'monad' : 'base';

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
      // IMPORTANT: Pass DeleGator address NOT user EOA
      // Swaps must be sent to/from the DeleGator smart account where funds are stored!
      const swaps = await this.dex.getOptimalSwaps(
        evaluation.executionPlan,
        chainName,
        strategy.delegatorAddress || strategy.userAddress, // Fallback for safety
      );

      // 6. Build rebalance transaction args
      // NOTE: totalValue is always 0 because bot doesn't send native tokens
      // All native tokens come from user's DeleGator via delegation

      // DEBUG: Log swaps array to find the bug
      this.logger.debug('=== SWAPS ARRAY FROM DEX SERVICE ===');
      swaps.forEach((swap, i) => {
        this.logger.debug(`Swap ${i}: fromToken=${swap.fromToken}, toToken=${swap.toToken}, target=${swap.target}`);
      });
      this.logger.debug('====================================');

      const { to, args, totalValue } = await this.buildRebalanceArgs(
        strategy,
        delegation,
        swaps,
        chainName,
      );

      // 7. Get wallet client
      const walletClient = this.chain.getWalletClient(chainName);
      const publicClient = this.chain.getPublicClient(chainName);

      if (totalValue > 0n) {
      this.logger.warn(
        `⚠️  Native token value detected (${totalValue}) - Current contract limitation: ` +
        `RebalanceExecutor hardcodes value=0 in DeleGator.execute() calls. ` +
        `Native swaps/wraps will fail until contract is upgraded to support nativeValues[] parameter.`
      );
    }

    this.logger.log(`Calling RebalanceExecutor.rebalance() at ${to} with bot value=${totalValue}`);

      // DEBUG: Log full arguments for troubleshooting
      this.logger.debug('=== REBALANCE CALL ARGUMENTS ===');
      this.logger.debug(`userAccount (DeleGator): ${args[0]}`);
      this.logger.debug(`strategyId: ${args[1].toString()}`);
      this.logger.debug(`tokensIn (args[2]) (${args[2].length}): ${JSON.stringify(args[2])}`);
      this.logger.debug(`swapTargets (args[3]) (${args[3].length}): ${JSON.stringify(args[3])}`);
      this.logger.debug(`swapCallDatas (args[4]) (${args[4].length} swaps)`);
      this.logger.debug(`minOutputAmounts (args[5]): ${args[5].map((x: bigint) => x.toString())}`);
      this.logger.debug(`nativeValues (args[6]): ${args[6].map((x: bigint) => x.toString())}`);
      this.logger.debug(`permissionContexts length (args[7]): ${args[7].length}`);
      this.logger.debug(`modes (args[8]): ${JSON.stringify(args[8])}`);
      this.logger.debug('================================');

      // 8. Debug mode: Send real transaction to capture events before revert
      const debugMode = this.config.get<string>('DEBUG_REBALANCE') === 'true';

      if (debugMode) {
        this.logger.warn('🔍 DEBUG MODE: Sending real transaction to capture events...');

        try {
          const txHash = await walletClient.writeContract({
            address: to,
            abi: RebalanceExecutorABI,
            functionName: 'rebalance',
            args,
            value: totalValue,
            gas: 15000000n, // Increased: 7 debug events + Pyth calls + DEX approvals/swaps require ~10M gas
          } as any);

          this.logger.log(`Debug transaction sent: ${txHash}`);
          this.logger.log('Waiting for receipt (will revert but events will be visible)...');

          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

          this.logger.error('Transaction receipt:', JSON.stringify(receipt, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2));

          // Decode events from logs
          if (receipt.logs && receipt.logs.length > 0) {
            this.logger.log(`\n${'='.repeat(50)}`);
            this.logger.log(`Found ${receipt.logs.length} event logs:`);
            this.logger.log('='.repeat(50));

            // Map of known debug event signatures
            const debugEvents: Record<string, string> = {
              // Will be populated with actual event signatures from contract
            };

            receipt.logs.forEach((log, i) => {
              // Type assertion: viem's Log type has topics but TS doesn't always infer it
              const logWithTopics = log as any;
              const eventSig = logWithTopics.topics?.[0] || 'No topics';
              const eventName = debugEvents[eventSig] || 'Unknown Event';

              this.logger.log(`\nEvent ${i + 1}:`);
              this.logger.log(`  Name: ${eventName}`);
              this.logger.log(`  Signature: ${eventSig}`);
              this.logger.log(`  Address: ${log.address}`);
              this.logger.log(`  Data: ${log.data}`);
              if (logWithTopics.topics && logWithTopics.topics.length > 1) {
                this.logger.log(`  Topics: ${logWithTopics.topics.slice(1).join(', ')}`);
              }
            });

            this.logger.log('\n' + '='.repeat(50));
            this.logger.log('Last emitted event shows where execution stopped');
            this.logger.log('='.repeat(50) + '\n');
          } else {
            this.logger.warn('⚠️  No events emitted before revert - contract failed very early');
          }

          throw new Error(`Debug transaction reverted (expected): ${txHash}`);
        } catch (error) {
          this.logger.error('Debug transaction failed:', error.message);
          throw error;
        }
      }

      // NEW: Delegation debugging mode
      const debugDelegationLevel = parseInt(this.config.get<string>('DEBUG_DELEGATION_LEVEL', '0'));

      if (debugDelegationLevel > 0) {
        this.logger.warn(`🔍 DEBUG_DELEGATION_LEVEL=${debugDelegationLevel} - Testing delegation step-by-step`);

        const permissionContext = args[7][0] as `0x${string}`; // First permissionContext
        const mode = args[8][0] as `0x${string}`; // First mode

        await this.executeDebugDelegationMode(
          debugDelegationLevel,
          strategy,
          swaps,
          to,
          permissionContext,
          mode,
          walletClient,
          publicClient,
        );

        return; // Skip normal rebalance execution
      }

      // Normal mode: Simulate contract call first
      const { request } = await publicClient.simulateContract({
        address: to,
        abi: RebalanceExecutorABI,
        functionName: 'rebalance',
        args,
        value: totalValue, // Send native tokens if swapping from native
        account: walletClient.account,
        authorizationList: undefined,
      } as any);

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

        // Calculate drift AFTER rebalance execution
        this.logger.log('Calculating driftAfter by re-analyzing portfolio...');
        let driftAfter = BigInt(drift); // Default to original drift if re-analysis fails

        try {
          // Re-evaluate portfolio state after swaps executed
          const evaluationAfter = await this.strategyEngine.evaluateStrategy(
            strategy.strategyLogic,
            strategy,
          );

          if (evaluationAfter && evaluationAfter.portfolioState) {
            driftAfter = BigInt(evaluationAfter.portfolioState.drift);
            this.logger.log(
              `Drift reduced: ${drift / 100}% → ${Number(driftAfter) / 100}% (${((drift - Number(driftAfter)) / drift * 100).toFixed(1)}% improvement)`,
            );
          } else {
            this.logger.warn('Failed to re-evaluate portfolio, using original drift as driftAfter');
          }
        } catch (error) {
          this.logger.warn(`Failed to calculate driftAfter: ${error.message}, using original drift`);
        }

        await this.prisma.rebalance.create({
          data: {
            strategyId,
            chainId,
            txHash,
            userAddress,
            drift: BigInt(drift),
            driftAfter,
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
          driftAfter: Number(driftAfter) / 100,
          gasUsed: receipt.gasUsed.toString(),
          timestamp: new Date().toISOString(),
        });

        this.logger.log(`Rebalance completed successfully: ${txHash}`);
      } else {
        throw new Error(`Transaction reverted: ${txHash}`);
      }
    } catch (error) {
      // Enhanced error logging to capture full contract revert details
      this.logger.error('=== REBALANCE ERROR DETAILS ===');
      this.logger.error(`Strategy ID: ${strategyId}`);
      this.logger.error(`Error Type: ${error.constructor.name}`);
      this.logger.error(`Error Message: ${error.message}`);

      // Log full error object for contract reverts (contains revert data)
      if (error.data || error.shortMessage || error.metaMessages) {
        this.logger.error(`Contract Revert Data: ${JSON.stringify({
          data: error.data,
          shortMessage: error.shortMessage,
          metaMessages: error.metaMessages,
          details: error.details,
        }, null, 2)}`);

        // Try to decode error signature if present
        if (error.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
          const errorSig = error.data.substring(0, 10);
          this.logger.error(`Error Signature: ${errorSig}`);

          // Try to decode using ABI (viem should auto-decode if ABI has the error)
          if (error.name) {
            this.logger.error(`Decoded Error Name: ${error.name}`);
          }
        }
      }

      this.logger.error(`Stack: ${error.stack}`);
      this.logger.error('===============================');

      this.logger.error(
        `Rebalance failed for strategy ${strategyId}: ${error.message}`,
        error.stack,
      );

      // Save failed rebalance
      const botWalletClient = this.chain.getWalletClient(chainName);
      const botAddress = botWalletClient.account.address;

      // Generate unique placeholder txHash for failed rebalances
      // Format: failed-{timestamp}-{random}
      const failedTxHash = `failed-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // For failed rebalances, driftAfter = drift (portfolio unchanged)
      const driftAfter = BigInt(drift);

      await this.prisma.rebalance.create({
        data: {
          strategyId,
          chainId,
          txHash: failedTxHash,
          userAddress,
          drift: BigInt(drift),
          driftAfter,
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
    totalValue: bigint;
  }> {
    // userAccount = DeleGator smart contract address (contract requires this for registry lookup)
    // delegatorAddress = same as userAccount (DeleGator contract)
    const delegatorAddress = strategy.delegatorAddress as `0x${string}`;
    const userAccount = delegatorAddress; // Contract validates userAccount is a DeleGator
    const strategyId = BigInt(strategy.strategyId);

    if (!delegatorAddress) {
      throw new Error('Strategy has no delegatorAddress - cannot execute rebalance');
    }

    // 1. Encode delegation as permissionContext
    // The delegation proves: "user (via DeleGator) delegates to bot"
    const delegationData = delegation.delegationData;

    // Build caveat array with proper structure
    const caveats = (delegationData.caveats || []).map((c: any) => [
      c.enforcer as `0x${string}`,
      c.terms as `0x${string}`,
      c.args || ('0x' as `0x${string}`),
    ]);

    // DelegationManager expects Delegation[] (array of delegations), not single Delegation
    const permissionContext = encodeAbiParameters(
      parseAbiParameters('(address,address,bytes32,(address,bytes,bytes)[],uint256,bytes)[]'),
      [
        [
          [
            delegationData.delegate as `0x${string}`,
            delegatorAddress, // The DeleGator contract address
            (delegationData.authority || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
            caveats,
            BigInt(delegationData.salt || 0),
            delegation.signature as `0x${string}`,
          ],
        ],
      ],
    );

    // 2. Build swap data arrays
    const tokensIn: `0x${string}`[] = swaps.map((s) => s.fromToken as `0x${string}`); // Token being sold in each swap
    const swapTargets: `0x${string}`[] = swaps.map((s) => s.target as `0x${string}`);
    const swapCallDatas: `0x${string}`[] = swaps.map((s) => s.data as `0x${string}`);
    const minOutputAmounts: bigint[] = swaps.map((s) => BigInt(s.minOutput || 0));

    // 3. Build native values array - DeleGator will send these amounts with each swap
    // This allows native token operations (wraps, native swaps) without bot needing funds
    const nativeValues: bigint[] = swaps.map((s) => {
      const value = s.value && s.value !== '0' ? BigInt(s.value) : 0n;
      if (value > 0n) {
        this.logger.debug(`Swap ${s.target}: DeleGator will send ${value} native tokens`);
      }
      return value;
    });

    // 4. Bot msg.value is always 0 - all funds come from user's DeleGator
    const totalValue = 0n;
    this.logger.debug(`Bot msg.value: ${totalValue} (all funds from DeleGator)`);

    // 4. Execution mode (BATCH_DEFAULT_MODE)
    // CRITICAL: Use BATCH mode because we're encoding with ExecutionLib.encodeBatch()
    // SINGLE mode (0x00) expects encodeSingle format (abi.encodePacked)
    // BATCH mode (0x01) expects encodeBatch format (abi.encode)
    const MODE_BATCH_DEFAULT =
      '0x0100000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

    // 5. Get executor address
    const executorAddress = CONTRACTS[chainName].executor;

    return {
      to: executorAddress,
      args: [
        userAccount,
        strategyId,
        tokensIn,          // NEW: Tokens being sold (for automatic approval)
        swapTargets,
        swapCallDatas,
        minOutputAmounts,
        nativeValues,
        [permissionContext],
        [MODE_BATCH_DEFAULT],
      ],
      totalValue,
    };
  }

  /**
   * Execute delegation debugging mode
   * Tests delegation execution step-by-step based on debug level
   */
  private async executeDebugDelegationMode(
    level: number,
    strategy: any,
    swaps: any[],
    executorAddress: `0x${string}`,
    permissionContext: `0x${string}`,
    mode: `0x${string}`,
    walletClient: any,
    publicClient: any,
  ) {
    const userAccount = strategy.delegatorAddress as `0x${string}`;
    const strategyId = BigInt(strategy.strategyId);

    this.logger.log(`\n${'='.repeat(60)}`);
    this.logger.log(`DELEGATION DEBUG LEVEL ${level}`);
    this.logger.log('='.repeat(60));

    try {
      switch (level) {
        case 1:
          // Test strategy ownership (view call - no transaction)
          this.logger.log('Level 1: Testing strategy ownership validation...');
          const ownershipResult = await publicClient.readContract({
            address: executorAddress,
            abi: RebalanceExecutorABI,
            functionName: 'testStrategyOwnership',
            args: [userAccount, strategyId],
          });

          this.logger.log(`Result: ${JSON.stringify(ownershipResult)}`);
          this.logger.log(`✅ Strategy ownership test ${ownershipResult[0] ? 'PASSED' : 'FAILED'}`);
          if (!ownershipResult[0]) {
            this.logger.error(`Error: ${ownershipResult[3]}`);
          }
          break;

        case 2:
          // Test delegation no-op (signature validation only)
          this.logger.log('Level 2: Testing delegation signature validation (no-op execution)...');

          // First simulate to check if it will revert
          try {
            const simulateResult = await publicClient.readContract({
              address: executorAddress,
              abi: RebalanceExecutorABI,
              functionName: 'testDelegationNoOp',
              args: [userAccount, permissionContext, mode],
            });
            this.logger.log(`Simulation result: ${simulateResult}`);
          } catch (simError) {
            this.logger.error(`Simulation failed: ${simError.message}`);
          }

          const noopHash = await walletClient.writeContract({
            address: executorAddress,
            abi: RebalanceExecutorABI,
            functionName: 'testDelegationNoOp',
            args: [userAccount, permissionContext, mode],
            gas: 500000n, // Explicit gas limit to ensure enough gas
          });

          this.logger.log(`Transaction sent: ${noopHash}`);
          const noopReceipt = await publicClient.waitForTransactionReceipt({ hash: noopHash });
          this.logger.log(`Status: ${noopReceipt.status}`);
          this.logger.log(`Gas used: ${noopReceipt.gasUsed.toString()}`);

          // Check for events
          if (noopReceipt.logs && noopReceipt.logs.length > 0) {
            this.logger.log(`Found ${noopReceipt.logs.length} events:`);
            noopReceipt.logs.forEach((log: any, i: number) => {
              // Convert BigInt to string for logging
              const logStr = JSON.stringify(log, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
              );
              this.logger.log(`  Event ${i + 1}: ${logStr}`);
            });
          } else {
            this.logger.warn('No events emitted');
          }

          this.logger.log(`✅ Delegation no-op test ${noopReceipt.status === 'success' ? 'PASSED' : 'FAILED'}`);
          break;

        case 3:
          // Test delegation approval
          this.logger.log('Level 3: Testing delegation with token approval...');
          if (swaps.length === 0) {
            this.logger.warn('No swaps available - cannot test approval');
            return;
          }

          const firstSwap = swaps[0];
          const approvalHash = await walletClient.writeContract({
            address: executorAddress,
            abi: RebalanceExecutorABI,
            functionName: 'testDelegationApproval',
            args: [
              userAccount,
              firstSwap.fromToken as `0x${string}`,
              firstSwap.target as `0x${string}`,
              permissionContext,
              mode,
            ],
          });

          this.logger.log(`Transaction sent: ${approvalHash}`);
          const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          this.logger.log(`Status: ${approvalReceipt.status}`);
          this.logger.log(`✅ Delegation approval test ${approvalReceipt.status === 'success' ? 'PASSED' : 'FAILED'}`);
          break;

        case 4:
          // Test delegation transfer
          this.logger.log('Level 4: Testing delegation with token transfer...');
          if (swaps.length === 0) {
            this.logger.warn('No swaps available - cannot test transfer');
            return;
          }

          const transferToken = swaps[0].fromToken as `0x${string}`;
          const transferRecipient = walletClient.account.address; // Send to bot as test
          const transferAmount = 1n; // Transfer 1 wei as test

          const transferHash = await walletClient.writeContract({
            address: executorAddress,
            abi: RebalanceExecutorABI,
            functionName: 'testDelegationTransfer',
            args: [
              userAccount,
              transferToken,
              transferRecipient,
              transferAmount,
              permissionContext,
              mode,
            ],
          });

          this.logger.log(`Transaction sent: ${transferHash}`);
          const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
          this.logger.log(`Status: ${transferReceipt.status}`);
          this.logger.log(`✅ Delegation transfer test ${transferReceipt.status === 'success' ? 'PASSED' : 'FAILED'}`);
          break;

        case 5:
          // Test delegation single swap
          this.logger.log('Level 5: Testing delegation with single swap (approve + swap batch)...');
          if (swaps.length === 0) {
            this.logger.warn('No swaps available - cannot test single swap');
            return;
          }

          const singleSwap = swaps[0];
          const swapHash = await walletClient.writeContract({
            address: executorAddress,
            abi: RebalanceExecutorABI,
            functionName: 'testDelegationSingleSwap',
            args: [
              userAccount,
              singleSwap.fromToken as `0x${string}`,
              singleSwap.target as `0x${string}`,
              singleSwap.data as `0x${string}`,
              BigInt(singleSwap.value || 0),
              permissionContext,
              mode,
            ],
          });

          this.logger.log(`Transaction sent: ${swapHash}`);
          const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
          this.logger.log(`Status: ${swapReceipt.status}`);
          this.logger.log(`✅ Delegation single swap test ${swapReceipt.status === 'success' ? 'PASSED' : 'FAILED'}`);
          break;

        case 6:
          // Test delegation swap only (no approval - assumes Level 3 already set approval)
          this.logger.log('Level 6: Testing delegation with swap ONLY (no approval)...');
          this.logger.log('Note: Assumes approval is already set from Level 3 test');
          if (swaps.length === 0) {
            this.logger.warn('No swaps available - cannot test swap only');
            return;
          }

          const swapOnlySwap = swaps[0];
          const swapOnlyHash = await walletClient.writeContract({
            address: executorAddress,
            abi: RebalanceExecutorABI,
            functionName: 'testDelegationSwapOnly',
            args: [
              userAccount,
              swapOnlySwap.target as `0x${string}`,
              swapOnlySwap.data as `0x${string}`,
              BigInt(swapOnlySwap.value || 0),
              permissionContext,
              mode,
            ],
          });

          this.logger.log(`Transaction sent: ${swapOnlyHash}`);
          const swapOnlyReceipt = await publicClient.waitForTransactionReceipt({ hash: swapOnlyHash });
          this.logger.log(`Status: ${swapOnlyReceipt.status}`);
          this.logger.log(`✅ Delegation swap-only test ${swapOnlyReceipt.status === 'success' ? 'PASSED' : 'FAILED'}`);
          break;

        default:
          this.logger.error(`Invalid DEBUG_DELEGATION_LEVEL: ${level}. Must be 1-6.`);
      }
    } catch (error) {
      this.logger.error(`\n❌ DEBUG LEVEL ${level} FAILED`);
      this.logger.error(`Error: ${error.message}`);
      if (error.data) {
        this.logger.error(`Revert data: ${error.data}`);
      }
      throw error;
    } finally {
      this.logger.log('='.repeat(60) + '\n');
    }
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

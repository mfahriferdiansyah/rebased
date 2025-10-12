import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChainService } from '@app/blockchain';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, IndexerJobData } from '@app/queue/types';
import { SupportedChain } from '@app/blockchain/chains';

@Injectable()
export class ChainListenerService implements OnModuleInit {
  private readonly logger = new Logger(ChainListenerService.name);
  private isListening = false;

  constructor(
    private readonly chain: ChainService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_NAMES.INDEXER) private readonly indexerQueue: Queue,
  ) {}

  async onModuleInit() {
    // Start listening to both chains
    await this.startListening('monad');
    await this.startListening('base');
  }

  /**
   * Start listening to events on a chain
   */
  private async startListening(chain: SupportedChain) {
    this.logger.log(`Starting event listener for ${chain}`);

    const client = this.chain.getPublicClient(chain);
    const chainId = chain === 'monad' ? 10143 : 84532;

    // Get contract addresses
    const strategyRegistry = this.config.get(
      `blockchain.${chain}.contracts.strategyRegistry`,
    );
    const delegationManager = this.config.get(
      `blockchain.${chain}.contracts.delegationManager`,
    );
    const delegateExecutor = this.config.get(
      `blockchain.${chain}.contracts.delegateExecutor`,
    );

    // Listen to StrategyRegistry events
    await this.watchContract(
      chain,
      strategyRegistry as `0x${string}`,
      'StrategyRegistry',
      [
        'StrategyCreated',
        'StrategyUpdated',
        'StrategyDeactivated',
        'RebalanceThresholdUpdated',
      ],
    );

    // Listen to DelegationManager events
    await this.watchContract(
      chain,
      delegationManager as `0x${string}`,
      'DelegationManager',
      ['DelegationCreated', 'DelegationRevoked', 'DelegationExecuted'],
    );

    // Listen to DelegateExecutor events
    await this.watchContract(
      chain,
      delegateExecutor as `0x${string}`,
      'DelegateExecutor',
      ['RebalanceExecuted', 'RebalanceFailed', 'SwapExecuted'],
    );
  }

  /**
   * Watch events from a specific contract
   */
  private async watchContract(
    chain: SupportedChain,
    address: `0x${string}`,
    contractName: string,
    events: string[],
  ) {
    const client = this.chain.getPublicClient(chain);
    const chainId = chain === 'monad' ? 10143 : 84532;

    // TODO: Use viem's watchContractEvent with actual ABIs
    // For now, set up a polling mechanism

    this.logger.log(
      `Watching ${contractName} on ${chain} for events: ${events.join(', ')}`,
    );

    // Poll for new blocks every 3 seconds
    const pollInterval = 3000;

    setInterval(async () => {
      try {
        const currentBlock = await client.getBlockNumber();

        // TODO: Replace with actual event watching using viem
        // client.watchContractEvent({
        //   address,
        //   abi: CONTRACT_ABI,
        //   eventName: 'EventName',
        //   onLogs: (logs) => this.handleLogs(logs, chain)
        // })

        // For now, just log the current block
        this.logger.debug(
          `${chain} current block: ${currentBlock}`,
        );
      } catch (error) {
        this.logger.error(
          `Error polling ${chain}: ${error.message}`,
        );
      }
    }, pollInterval);
  }

  /**
   * Handle contract event logs
   */
  private async handleLogs(logs: any[], chain: SupportedChain) {
    for (const log of logs) {
      try {
        const jobData: IndexerJobData = {
          chainId: chain === 'monad' ? 10143 : 84532,
          eventName: log.eventName,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          data: log.args,
        };

        // Queue event for processing
        await this.indexerQueue.add('process-event', jobData);

        this.logger.debug(
          `Queued ${log.eventName} event from ${chain} (block ${log.blockNumber})`,
        );
      } catch (error) {
        this.logger.error(
          `Error handling log: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Get latest indexed block for a chain
   */
  async getLatestIndexedBlock(chain: SupportedChain): Promise<bigint> {
    // TODO: Query database for last indexed block
    // For now, return 0
    return 0n;
  }

  /**
   * Health check for listeners
   */
  async healthCheck(): Promise<{ monad: boolean; base: boolean }> {
    try {
      const monadClient = this.chain.getPublicClient('monad');
      const baseClient = this.chain.getPublicClient('base');

      const [monadBlock, baseBlock] = await Promise.all([
        monadClient.getBlockNumber().catch(() => null),
        baseClient.getBlockNumber().catch(() => null),
      ]);

      return {
        monad: monadBlock !== null,
        base: baseBlock !== null,
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return { monad: false, base: false };
    }
  }
}

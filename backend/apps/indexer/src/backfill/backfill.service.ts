import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChainService } from '@app/blockchain';
import { PrismaService } from '@app/database';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, IndexerJobData } from '@app/queue/types';
import { SupportedChain } from '@app/blockchain/chains';

@Injectable()
export class BackfillService {
  private readonly logger = new Logger(BackfillService.name);
  private isBackfilling = false;

  constructor(
    private readonly chain: ChainService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_NAMES.INDEXER) private readonly indexerQueue: Queue,
  ) {}

  /**
   * Backfill historical events for a chain
   */
  async backfillChain(
    chain: SupportedChain,
    fromBlock?: bigint,
    toBlock?: bigint,
  ): Promise<{ eventsProcessed: number; blocksScanned: number }> {
    if (this.isBackfilling) {
      throw new Error('Backfill already in progress');
    }

    this.isBackfilling = true;

    try {
      this.logger.log(`Starting backfill for ${chain}`);

      const client = this.chain.getPublicClient(chain);
      const currentBlock = await client.getBlockNumber();

      // Determine block range
      const startBlock = fromBlock || this.getDeploymentBlock(chain);
      const endBlock = toBlock || currentBlock;

      this.logger.log(
        `Backfilling ${chain} from block ${startBlock} to ${endBlock} (${endBlock - startBlock + 1n} blocks)`,
      );

      const batchSize = 1000n; // Process 1000 blocks at a time
      let eventsProcessed = 0;
      let blocksScanned = 0;

      for (let block = startBlock; block <= endBlock; block += batchSize) {
        const toBlockBatch = block + batchSize - 1n > endBlock ? endBlock : block + batchSize - 1n;

        this.logger.debug(`Processing blocks ${block} to ${toBlockBatch}`);

        const events = await this.fetchEventsInRange(chain, block, toBlockBatch);

        // Queue events for processing
        for (const event of events) {
          await this.indexerQueue.add('process-event', event);
          eventsProcessed++;
        }

        blocksScanned += Number(toBlockBatch - block + 1n);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.logger.log(
        `Backfill complete for ${chain}: ${eventsProcessed} events, ${blocksScanned} blocks`,
      );

      return { eventsProcessed, blocksScanned };
    } finally {
      this.isBackfilling = false;
    }
  }

  /**
   * Fetch events in a block range
   */
  private async fetchEventsInRange(
    chain: SupportedChain,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<IndexerJobData[]> {
    const client = this.chain.getPublicClient(chain);
    const chainId = chain === 'monad' ? 10143 : 84532;

    // Get contract addresses
    const contracts = [
      this.config.get(`blockchain.${chain}.contracts.strategyRegistry`),
      this.config.get(`blockchain.${chain}.contracts.delegationManager`),
      this.config.get(`blockchain.${chain}.contracts.delegateExecutor`),
    ].filter(Boolean);

    const events: IndexerJobData[] = [];

    // TODO: Use viem's getLogs with proper ABIs
    // For now, return empty array (needs actual implementation with contract ABIs)

    this.logger.debug(
      `Fetched ${events.length} events from blocks ${fromBlock}-${toBlock}`,
    );

    return events;
  }

  /**
   * Get deployment block for a chain
   */
  private getDeploymentBlock(chain: SupportedChain): bigint {
    // Return the block where contracts were deployed
    // TODO: Store deployment blocks in config
    return chain === 'monad' ? 0n : 0n;
  }

  /**
   * Backfill specific contract events
   */
  async backfillContract(
    chain: SupportedChain,
    contractAddress: string,
    eventName: string,
    fromBlock?: bigint,
    toBlock?: bigint,
  ) {
    this.logger.log(
      `Backfilling ${eventName} events from ${contractAddress} on ${chain}`,
    );

    const client = this.chain.getPublicClient(chain);
    const currentBlock = await client.getBlockNumber();

    const startBlock = fromBlock || this.getDeploymentBlock(chain);
    const endBlock = toBlock || currentBlock;

    // TODO: Implement specific event backfill using viem's getLogs
    // with contract address and event signature

    this.logger.log(`Backfill complete for ${eventName} on ${contractAddress}`);
  }

  /**
   * Get backfill progress
   */
  async getProgress(chain: SupportedChain): Promise<{
    isBackfilling: boolean;
    currentBlock: bigint;
    latestIndexedBlock: bigint;
    remainingBlocks: bigint;
  }> {
    const client = this.chain.getPublicClient(chain);
    const currentBlock = await client.getBlockNumber();

    // TODO: Query database for latest indexed block
    const latestIndexedBlock = 0n;

    return {
      isBackfilling: this.isBackfilling,
      currentBlock,
      latestIndexedBlock,
      remainingBlocks: currentBlock - latestIndexedBlock,
    };
  }

  /**
   * Pause backfill
   */
  pause() {
    this.logger.warn('Backfill paused');
    this.isBackfilling = false;
  }

  /**
   * Resume backfill
   */
  async resume(chain: SupportedChain) {
    this.logger.log('Resuming backfill...');
    const progress = await this.getProgress(chain);
    await this.backfillChain(chain, progress.latestIndexedBlock + 1n);
  }
}

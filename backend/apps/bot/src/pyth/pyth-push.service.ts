import { Injectable, Logger } from '@nestjs/common';
import { ChainService } from '@app/blockchain';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Pyth Price Push Service
 *
 * Implements hybrid push strategy: checks price staleness and pushes updates
 * when needed before rebalancing to ensure fresh price calculations.
 *
 * Flow:
 * 1. Check each token's on-chain Pyth timestamp
 * 2. If > threshold (default 1hr), fetch fresh price from Hermes
 * 3. Push update to on-chain Pyth contract (costs ~$0.01-$1 per feed)
 * 4. Continue with rebalance using fresh prices
 */
@Injectable()
export class PythPushService {
  private readonly logger = new Logger(PythPushService.name);

  // Pyth Hermes API endpoint
  private readonly hermesUrl = 'https://hermes.pyth.network';

  // Staleness threshold (default: 1 hour = 3600s)
  // Tokens older than this will trigger a price push
  private readonly stalenessThreshold: number;

  // Whether hybrid push is enabled (can disable for testing)
  private readonly enablePush: boolean;

  constructor(
    private readonly chain: ChainService,
    private readonly config: ConfigService,
  ) {
    this.stalenessThreshold = this.config.get<number>(
      'PYTH_STALENESS_THRESHOLD',
      3600, // 1 hour default
    );
    this.enablePush = this.config.get<string>('ENABLE_PYTH_PUSH', 'true') === 'true';
  }

  /**
   * Check and push stale prices before rebalance
   *
   * @param tokens Array of token addresses in portfolio
   * @param chainName Chain name ('monad', 'base-sepolia', or 'base-mainnet')
   * @returns Object with push results
   */
  async ensureFreshPrices(
    tokens: string[],
    chainName: 'monad' | 'base-sepolia' | 'base-mainnet',
  ): Promise<{
    totalPushed: number;
    cost: bigint;
    staleTokens: string[];
  }> {
    if (!this.enablePush) {
      this.logger.warn('Pyth push disabled, skipping staleness check');
      return { totalPushed: 0, cost: 0n, staleTokens: [] };
    }

    this.logger.log(`Checking staleness for ${tokens.length} tokens...`);

    const publicClient = this.chain.getPublicClient(chainName);
    const oracleAddress = this.getOracleAddress(chainName);

    // 1. Check staleness for each token
    const staleChecks = await Promise.all(
      tokens.map(async (token) => {
        try {
          // Get feed ID from oracle
          const feedId = await publicClient.readContract({
            address: oracleAddress,
            abi: this.getPythOracleABI(),
            functionName: 'priceFeeds',
            args: [token as `0x${string}`],
            authorizationList: undefined,
          }) as `0x${string}`;

          if (feedId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            this.logger.warn(`Token ${token} has no Pyth feed configured`);
            return { token, feedId: null, isStale: false };
          }

          // Get Pyth price with full struct to check publishTime
          const pythAddress = this.getPythAddress(chainName);
          const price = await publicClient.readContract({
            address: pythAddress,
            abi: this.getPythABI(),
            functionName: 'getPriceUnsafe',
            args: [feedId],
            authorizationList: undefined,
          }) as any;

          // price is a struct: { price: int64, conf: uint64, expo: int32, publishTime: uint256 }
          const publishTime = Number(price.publishTime);
          const currentTime = Math.floor(Date.now() / 1000);
          const age = currentTime - publishTime;

          const isStale = age > this.stalenessThreshold;

          if (isStale) {
            this.logger.warn(
              `Token ${token}: Price is ${age}s old (> ${this.stalenessThreshold}s threshold)`,
            );
          } else {
            this.logger.debug(
              `Token ${token}: Price is ${age}s old (< ${this.stalenessThreshold}s threshold) ✓`,
            );
          }

          return { token, feedId, isStale, age };
        } catch (error) {
          this.logger.error(`Failed to check staleness for ${token}:`, error);
          return { token, feedId: null, isStale: false };
        }
      }),
    );

    // 2. Filter stale tokens
    const staleTokens = staleChecks
      .filter((check) => check.isStale && check.feedId)
      .map((check) => ({ token: check.token, feedId: check.feedId!, age: check.age }));

    if (staleTokens.length === 0) {
      this.logger.log('All prices are fresh, no push needed ✓');
      return { totalPushed: 0, cost: 0n, staleTokens: [] };
    }

    this.logger.warn(
      `Found ${staleTokens.length} stale tokens, pushing fresh prices...`,
    );

    // 3. Fetch fresh prices from Hermes
    const feedIds = staleTokens.map((t) => t.feedId);
    const updateData = await this.fetchPriceUpdates(feedIds);

    if (!updateData || updateData.length === 0) {
      throw new Error('Failed to fetch price updates from Hermes');
    }

    // 4. Calculate update fee
    const pythAddress = this.getPythAddress(chainName);
    const updateFee = await publicClient.readContract({
      address: pythAddress,
      abi: this.getPythABI(),
      functionName: 'getUpdateFee',
      args: [updateData],
      authorizationList: undefined,
    }) as bigint;

    this.logger.log(
      `Update fee for ${staleTokens.length} feeds: ${updateFee} wei (~$${(Number(updateFee) / 1e18 * 3900).toFixed(4)})`,
    );

    // 5. Push updates to on-chain Pyth
    const walletClient = this.chain.getWalletClient(chainName);

    try {
      const txHash = await walletClient.writeContract({
        address: pythAddress,
        abi: this.getPythABI(),
        functionName: 'updatePriceFeeds',
        args: [updateData],
        value: updateFee,
      } as any);

      this.logger.log(`Price push transaction sent: ${txHash}`);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status !== 'success') {
        throw new Error(`Price push transaction failed: ${txHash}`);
      }

      this.logger.log(
        `✓ Successfully pushed ${staleTokens.length} price updates (cost: ${updateFee} wei)`,
      );

      return {
        totalPushed: staleTokens.length,
        cost: updateFee,
        staleTokens: staleTokens.map((t) => t.token),
      };
    } catch (error) {
      this.logger.error('Failed to push price updates:', error);
      throw error;
    }
  }

  /**
   * Fetch price updates from Pyth Hermes API
   */
  private async fetchPriceUpdates(feedIds: `0x${string}`[]): Promise<`0x${string}`[]> {
    try {
      // Build query string
      const queryParams = feedIds.map((id) => `ids[]=${id}`).join('&');
      const url = `${this.hermesUrl}/v2/updates/price/latest?${queryParams}`;

      this.logger.debug(`Fetching from Hermes: ${url}`);

      const response = await axios.get(url);

      if (!response.data || !response.data.binary || !response.data.binary.data) {
        throw new Error('Invalid response from Hermes');
      }

      // Response contains binary.data which is an array of hex strings (VAA data)
      const updateData = response.data.binary.data as string[];

      this.logger.debug(`Received ${updateData.length} price updates from Hermes`);

      return updateData.map((data) => `0x${data.replace(/^0x/, '')}` as `0x${string}`);
    } catch (error) {
      this.logger.error('Failed to fetch from Hermes:', error);
      throw error;
    }
  }

  /**
   * Get Pyth Oracle address for chain
   */
  private getOracleAddress(chainName: 'monad' | 'base-sepolia' | 'base-mainnet'): `0x${string}` {
    if (chainName === 'base-mainnet') {
      return this.config.get<string>('BASE_MAINNET_ORACLE') as `0x${string}`;
    } else if (chainName === 'base-sepolia') {
      return this.config.get<string>('BASE_SEPOLIA_ORACLE') as `0x${string}`;
    } else if (chainName === 'monad') {
      return this.config.get<string>('MONAD_ORACLE') as `0x${string}`;
    }
    throw new Error(`Unknown chain: ${chainName}`);
  }

  /**
   * Get Pyth contract address for chain
   */
  private getPythAddress(chainName: 'monad' | 'base-sepolia' | 'base-mainnet'): `0x${string}` {
    if (chainName === 'base-mainnet') {
      return '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a'; // Base Mainnet Pyth
    } else if (chainName === 'base-sepolia') {
      return '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729'; // Base Sepolia Pyth
    } else if (chainName === 'monad') {
      return this.config.get<string>('PYTH_CONTRACT_MONAD') as `0x${string}`;
    }
    throw new Error(`Unknown chain: ${chainName}`);
  }

  /**
   * Minimal Pyth Oracle ABI (just priceFeeds getter)
   */
  private getPythOracleABI() {
    return [
      {
        type: 'function',
        name: 'priceFeeds',
        stateMutability: 'view',
        inputs: [{ name: 'token', type: 'address' }],
        outputs: [{ name: 'feedId', type: 'bytes32' }],
      },
    ] as const;
  }

  /**
   * Minimal Pyth contract ABI
   */
  private getPythABI() {
    return [
      {
        type: 'function',
        name: 'getPriceUnsafe',
        stateMutability: 'view',
        inputs: [{ name: 'id', type: 'bytes32' }],
        outputs: [
          {
            name: '',
            type: 'tuple',
            components: [
              { name: 'price', type: 'int64' },
              { name: 'conf', type: 'uint64' },
              { name: 'expo', type: 'int32' },
              { name: 'publishTime', type: 'uint256' },
            ],
          },
        ],
      },
      {
        type: 'function',
        name: 'getUpdateFee',
        stateMutability: 'view',
        inputs: [{ name: 'updateData', type: 'bytes[]' }],
        outputs: [{ name: 'feeAmount', type: 'uint256' }],
      },
      {
        type: 'function',
        name: 'updatePriceFeeds',
        stateMutability: 'payable',
        inputs: [{ name: 'updateData', type: 'bytes[]' }],
        outputs: [],
      },
    ] as const;
  }
}

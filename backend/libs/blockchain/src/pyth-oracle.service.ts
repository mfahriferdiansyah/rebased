import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainService } from './chain.service';

/**
 * Pyth Network Oracle Service
 * Fetches real-time crypto prices from Pyth on-chain oracles
 *
 * Pyth Price Feed IDs (testnet & mainnet):
 * - ETH/USD: 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
 * - USDC/USD: 0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a
 * - WETH is same as ETH
 */
@Injectable()
export class PythOracleService {
  private readonly logger = new Logger(PythOracleService.name);

  // Pyth contract addresses per chain
  private readonly PYTH_CONTRACTS = {
    monad: '0x2880aB155794e7179c9eE2e38200202908C17B43', // Monad testnet
    base: '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',   // Base Sepolia
  };

  // Price feed IDs (same for all networks)
  // NOTE: Some feeds may not be available on all testnets (like Monad)
  private readonly PRICE_FEED_IDS: Record<string, `0x${string}`> = {
    // ETH/USD (available on most testnets)
    'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    'WETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    // USDC/USD (may not be available on all testnets)
    'USDC': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  };

  // Token address to symbol mapping (Monad testnet)
  private readonly TOKEN_SYMBOLS_MONAD: Record<string, string> = {
    '0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37': 'WETH', // Wrapped MON (treated as ETH for pricing)
    '0xf817257fed379853cde0fa4f97ab987181b1e5ea': 'USDC',
  };

  // Token address to symbol mapping (Base)
  private readonly TOKEN_SYMBOLS_BASE: Record<string, string> = {
    '0x4200000000000000000000000000000000000006': 'WETH',
    // Add Base tokens here
  };

  // Pyth contract ABI (minimal for getPrice)
  private readonly PYTH_ABI = [
    {
      inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
      name: 'getPrice',
      outputs: [
        {
          components: [
            { internalType: 'int64', name: 'price', type: 'int64' },
            { internalType: 'uint64', name: 'conf', type: 'uint64' },
            { internalType: 'int32', name: 'expo', type: 'int32' },
            { internalType: 'uint256', name: 'publishTime', type: 'uint256' },
          ],
          internalType: 'struct PythStructs.Price',
          name: 'price',
          type: 'tuple',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  constructor(
    private readonly chain: ChainService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get token price in USD from Pyth oracle
   * @param tokenAddress Token contract address
   * @param chainName Chain name ('monad' or 'base')
   * @returns Price in USD (e.g., 2500.45 for ETH)
   */
  async getTokenPrice(
    tokenAddress: string,
    chainName: 'monad' | 'base',
  ): Promise<number> {
    // Get token symbol from address (declare at function scope for catch block access)
    const symbol = this.getTokenSymbol(tokenAddress, chainName);

    try {
      if (!symbol) {
        this.logger.warn(`Unknown token address ${tokenAddress} on ${chainName}, defaulting to $1`);
        return 1; // Default for unknown tokens (likely stablecoins)
      }

      // Get Pyth price feed ID
      const priceFeedId = this.PRICE_FEED_IDS[symbol];

      if (!priceFeedId) {
        this.logger.warn(`No Pyth price feed for ${symbol}, defaulting to $1`);
        return 1;
      }

      // Fetch price from Pyth contract
      const price = await this.fetchPythPrice(priceFeedId, chainName);

      this.logger.debug(`Pyth price for ${symbol}: $${price.toFixed(2)}`);
      return price;
    } catch (error) {
      // Handle price feed not found (common on testnets for some assets)
      if (error.message?.includes('0x19abf40e')) {
        this.logger.warn(
          `Pyth price feed not available for ${symbol || 'unknown'} on ${chainName} testnet, using fallback $1`,
        );
        // For USDC/stablecoins, $1 is a reasonable fallback
        if (symbol === 'USDC' || symbol === 'USDT' || symbol === 'DAI') {
          return 1.0;
        }
      }

      this.logger.error(
        `Failed to fetch Pyth price for ${tokenAddress}: ${error.message}`,
      );
      // Fallback to default price on error
      return 1;
    }
  }

  /**
   * Get multiple token prices in batch
   */
  async getTokenPrices(
    tokenAddresses: string[],
    chainName: 'monad' | 'base',
  ): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    await Promise.all(
      tokenAddresses.map(async (address) => {
        const price = await this.getTokenPrice(address, chainName);
        priceMap.set(address.toLowerCase(), price);
      }),
    );

    return priceMap;
  }

  /**
   * Fetch price from Pyth contract
   */
  private async fetchPythPrice(
    priceFeedId: `0x${string}`,
    chainName: 'monad' | 'base',
  ): Promise<number> {
    const client = this.chain.getPublicClient(chainName);
    const pythContract = this.PYTH_CONTRACTS[chainName] as `0x${string}`;

    const result = await client.readContract({
      address: pythContract,
      abi: this.PYTH_ABI,
      functionName: 'getPrice',
      args: [priceFeedId],
      authorizationList: undefined,
    } as any);

    // Pyth returns: { price: int64, conf: uint64, expo: int32, publishTime: uint256 }
    const { price, expo } = result as { price: bigint; expo: number };

    // Convert to USD: price * 10^expo
    // Example: price=2500_00000000, expo=-8 => 2500.00000000 => $2500
    const priceUSD = Number(price) * Math.pow(10, expo);

    return priceUSD;
  }

  /**
   * Get token symbol from address
   */
  private getTokenSymbol(
    tokenAddress: string,
    chainName: 'monad' | 'base',
  ): string | null {
    const lowerAddress = tokenAddress.toLowerCase();

    const symbolMap =
      chainName === 'monad'
        ? this.TOKEN_SYMBOLS_MONAD
        : this.TOKEN_SYMBOLS_BASE;

    return symbolMap[lowerAddress] || null;
  }

  /**
   * Health check: verify Pyth oracle is accessible
   */
  async healthCheck(chainName: 'monad' | 'base'): Promise<boolean> {
    try {
      // Try to fetch ETH price as health check
      const ethPrice = await this.fetchPythPrice(
        this.PRICE_FEED_IDS.ETH,
        chainName,
      );
      return ethPrice > 0;
    } catch (error) {
      this.logger.warn(`Pyth health check failed on ${chainName}: ${error.message}`);
      return false;
    }
  }
}

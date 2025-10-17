import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainService } from './chain.service';

/**
 * Pyth Oracle Service
 * Fetches real-time crypto prices from OUR PythOracle wrapper contracts
 *
 * Architecture:
 * - Backend calls OUR PythOracle wrapper (not Pyth Network's native contract)
 * - OUR PythOracle is configured via setPriceFeed() with Pyth feed IDs
 * - OUR PythOracle handles stablecoin fallbacks and price scaling
 * - Returns prices in USD scaled from 18 decimals
 */
@Injectable()
export class PythOracleService {
  private readonly logger = new Logger(PythOracleService.name);

  // OUR PythOracle wrapper contracts (NOT Pyth Network's native contracts)
  // These are configured with setPriceFeed() and have stablecoin fallback logic
  private readonly PYTH_CONTRACTS = {
    monad: '0xf1B7083a8E624038Befe432EEBBF2a8f3aa47D22', // OUR PythOracle wrapper (Monad)
    base: '0xe21e88f31a639d661e2d50D3c9E5DF1B1E3acff2',   // OUR PythOracle wrapper (Base)
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

  // OUR PythOracle ABI (getPrice returns uint256 scaled to 18 decimals)
  private readonly PYTH_ABI = [
    {
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'getPrice',
      outputs: [{ internalType: 'uint256', name: 'price', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  constructor(
    private readonly chain: ChainService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get token price in USD from OUR PythOracle wrapper
   * @param tokenAddress Token contract address
   * @param chainName Chain name ('monad' or 'base')
   * @returns Price in USD (e.g., 2500.45 for ETH)
   */
  async getTokenPrice(
    tokenAddress: string,
    chainName: 'monad' | 'base',
  ): Promise<number> {
    // Get token symbol for logging (declare at function scope for catch block access)
    const symbol = this.getTokenSymbol(tokenAddress, chainName);

    try {
      // Fetch price from OUR PythOracle wrapper (no need for feed IDs - just pass token address)
      const price = await this.fetchPythPrice(tokenAddress, chainName);

      this.logger.debug(`Pyth price for ${tokenAddress} (${symbol || 'unknown'}): $${price.toFixed(2)}`);
      return price;
    } catch (error) {
      // Handle price feed not found (OUR PythOracle returns $1 for stablecoins automatically)
      if (error.message?.includes('0x19abf40e') || error.message?.includes('NoFeedConfigured')) {
        this.logger.warn(
          `Pyth price feed not available for ${symbol || tokenAddress} on ${chainName}, using fallback $1`,
        );
        // For stablecoins, $1 is a reasonable fallback
        return 1.0;
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
   * Fetch price from OUR PythOracle wrapper
   * @param tokenAddress Token contract address
   * @param chainName Chain name
   * @returns Price in USD
   */
  private async fetchPythPrice(
    tokenAddress: string,
    chainName: 'monad' | 'base',
  ): Promise<number> {
    const client = this.chain.getPublicClient(chainName);
    const pythContract = this.PYTH_CONTRACTS[chainName] as `0x${string}`;

    // Call OUR PythOracle's getPrice(address) function
    const result = await client.readContract({
      address: pythContract,
      abi: this.PYTH_ABI,
      functionName: 'getPrice',
      args: [tokenAddress as `0x${string}`],
      authorizationList: undefined,
    } as any);

    // OUR PythOracle returns uint256 scaled to 18 decimals
    // Example: 3934000000000000000000 = $3934 * 10^18
    const priceWei = result as bigint;

    // Convert from 18 decimals to USD: divide by 10^18
    const priceUSD = Number(priceWei) / 1e18;

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
   * Health check: verify OUR PythOracle is accessible
   */
  async healthCheck(chainName: 'monad' | 'base'): Promise<boolean> {
    try {
      // Try to fetch WETH price as health check
      const tokenMap = chainName === 'monad' ? this.TOKEN_SYMBOLS_MONAD : this.TOKEN_SYMBOLS_BASE;
      const wethAddress = Object.keys(tokenMap).find(addr => tokenMap[addr] === 'WETH');

      if (!wethAddress) {
        this.logger.warn(`No WETH address configured for ${chainName}`);
        return false;
      }

      const price = await this.fetchPythPrice(wethAddress, chainName);
      return price > 0;
    } catch (error) {
      this.logger.warn(`Pyth health check failed on ${chainName}: ${error.message}`);
      return false;
    }
  }
}

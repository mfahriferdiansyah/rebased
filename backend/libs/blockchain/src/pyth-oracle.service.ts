import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainService } from './chain.service';

/**
 * Pyth Oracle Service
 * Fetches real-time crypto prices using Hermes API (off-chain, free)
 * with on-chain fallback for reliability
 *
 * Architecture:
 * - Primary: Hermes API (off-chain, free, 577 crypto assets, 1-2s updates)
 * - Fallback: OUR PythOracle wrapper contracts (on-chain, requires gas + setup)
 *
 * Why Hermes?
 * - ✅ Free (no gas costs)
 * - ✅ Real-time prices (updated every 1-2 seconds)
 * - ✅ High confidence (< 0.2% on average)
 * - ✅ Works on ALL chains (chain-agnostic off-chain API)
 * - ✅ Supports all 15 curated tokens
 */
@Injectable()
export class PythOracleService {
  private readonly logger = new Logger(PythOracleService.name);

  // Hermes API endpoint (off-chain Pyth price service)
  private readonly HERMES_API = 'https://hermes.pyth.network';

  // Pyth feed IDs for Base mainnet tokens (from base-mainnet-curated-tokens.json)
  private readonly PYTH_FEED_IDS: Record<string, string> = {
    // Stablecoins
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC

    // Native ETH
    '0x0000000000000000000000000000000000000000': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH
    '0x4200000000000000000000000000000000000006': '0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6', // WETH

    // Wrapped BTC
    '0x0555e30da8f98308edb960aa94c0db47230d2b9c': '0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33', // WBTC

    // Base Native Tokens
    '0x940181a94a35a4569e4529a3cdfb74e38fd98631': '0x9db37f4d5654aad3e37e2e14ffd8d53265fb3026d1d8f91146539eebaa2ef45f', // AERO
    '0x532f27101965dd16442e59d40670faf5ebb142e4': '0x9b5729efe3d68e537cdcb2ca70444dea5f06e1660b562632609757076d0b9448', // BRETT
    '0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4': '0x3450d9fbb8c3cf749578315668e21fabb4cd78dcfda1c1cba698b804bae2db2a', // TOSHI
    '0x4ed4e862860bed51a9570b96d89af5e1b0efefed': '0x9c93e4a22c56885af427ac4277437e756e7ec403fbc892f975d497383bb33560', // DEGEN

    // DeFi Blue Chips
    '0x88fb150bdc53a65fe94dea0c9ba0a6daf8c6e196': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221', // LINK
    '0x63706e401c06ac8513145b7687a14804d17f814b': '0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445', // AAVE
    '0x58538e6a46e07434d7e7375bc268d3cb839c0133': '0xb7910ba7322db020416fcac28b48c01212fd9cc8fbcbaf7d30477ed8605f6bd4', // ENA
    '0x3055913c90fcc1a6ce9a358911721eeb942013a1': '0x2356af9529a1064d41e32d617e2ce1dca5733afa901daba9e2b68dee5d53ecf9', // Cake
    '0x8ee73c484a26e0a5df2ee2a4960b789967dd0415': '0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8', // CRV
    '0xbaa5cc21fd487b8fcc2f632f3f4e8d37262a0842': '0x5b2a4c542d4a74dd11784079ef337c0403685e3114ba0d9909b5c7a7e06fdc42', // MORPHO
    '0xa99f6e6785da0f5d6fb42495fe424bce029eeb3e': '0x9a4df90b25497f66b1afb012467e316e801ca3d839456db028892fe8c70c8016', // PENDLE
  };

  // OUR PythOracle wrapper contracts (fallback only)
  private readonly PYTH_CONTRACTS = {
    monad: '0xf1B7083a8E624038Befe432EEBBF2a8f3aa47D22',           // OUR PythOracle wrapper (Monad Testnet)
    'base-sepolia': '0x324b6E527ffc765B2A2Fd6B9133dA0FF8d31d6Fc',  // OUR PythOracle wrapper (Base Sepolia)
    'base-mainnet': '0x3727aa26BFA5b995A17551425d3cDDce24df9f10',  // OUR PythOracle wrapper (Base Mainnet)
  };

  // Token address to symbol mapping (Monad testnet)
  private readonly TOKEN_SYMBOLS_MONAD: Record<string, string> = {
    '0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37': 'WETH', // Wrapped MON (treated as ETH for pricing)
    '0xf817257fed379853cde0fa4f97ab987181b1e5ea': 'USDC',
  };

  // Token address to symbol mapping (Base)
  private readonly TOKEN_SYMBOLS_BASE: Record<string, string> = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0x0000000000000000000000000000000000000000': 'ETH',
    '0x4200000000000000000000000000000000000006': 'WETH',
    '0x0555e30da8f98308edb960aa94c0db47230d2b9c': 'WBTC',
    '0x940181a94a35a4569e4529a3cdfb74e38fd98631': 'AERO',
    '0x532f27101965dd16442e59d40670faf5ebb142e4': 'BRETT',
    '0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4': 'TOSHI',
    '0x4ed4e862860bed51a9570b96d89af5e1b0efefed': 'DEGEN',
    '0x88fb150bdc53a65fe94dea0c9ba0a6daf8c6e196': 'LINK',
    '0x63706e401c06ac8513145b7687a14804d17f814b': 'AAVE',
    '0x58538e6a46e07434d7e7375bc268d3cb839c0133': 'ENA',
    '0x3055913c90fcc1a6ce9a358911721eeb942013a1': 'Cake',
    '0x8ee73c484a26e0a5df2ee2a4960b789967dd0415': 'CRV',
    '0xbaa5cc21fd487b8fcc2f632f3f4e8d37262a0842': 'MORPHO',
    '0xa99f6e6785da0f5d6fb42495fe424bce029eeb3e': 'PENDLE',
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
   * Get token price in USD using Hermes API (primary) with on-chain fallback
   * @param tokenAddress Token contract address
   * @param chainName Chain name ('monad' or 'base')
   * @returns Price in USD (e.g., 2500.45 for ETH)
   */
  async getTokenPrice(
    tokenAddress: string,
    chainName: 'monad' | 'base-sepolia' | 'base-mainnet',
  ): Promise<number> {
    const symbol = this.getTokenSymbol(tokenAddress, chainName);

    // Strategy: Try Hermes first (free, fast, real-time), fallback to on-chain oracle
    try {
      // Try Hermes API first (off-chain, free, always fresh)
      const price = await this.fetchHermesPrice(tokenAddress);
      this.logger.debug(`Hermes price for ${symbol || tokenAddress}: $${price.toFixed(2)}`);
      return price;
    } catch (hermesError) {
      this.logger.warn(
        `Hermes API failed for ${symbol || tokenAddress}: ${hermesError.message}. Trying on-chain oracle...`,
      );

      try {
        // Fallback to on-chain oracle (costs gas to read, may be stale)
        const price = await this.fetchPythPrice(tokenAddress, chainName);
        this.logger.debug(`On-chain oracle price for ${symbol || tokenAddress}: $${price.toFixed(2)}`);
        return price;
      } catch (oracleError) {
        this.logger.error(
          `Both Hermes and on-chain oracle failed for ${symbol || tokenAddress}. ` +
          `Hermes: ${hermesError.message}, Oracle: ${oracleError.message}`,
        );

        // Last resort: $1 fallback for stablecoins
        if (symbol === 'USDC' || symbol === 'USDT' || symbol === 'DAI') {
          this.logger.warn(`Using $1 fallback for stablecoin ${symbol}`);
          return 1.0;
        }

        // For non-stablecoins, throw error (don't guess prices)
        throw new Error(
          `Unable to fetch price for ${symbol || tokenAddress} from any source`,
        );
      }
    }
  }

  /**
   * Get multiple token prices in batch
   */
  async getTokenPrices(
    tokenAddresses: string[],
    chainName: 'monad' | 'base-sepolia' | 'base-mainnet',
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
   * Fetch price from Hermes API (off-chain, free, real-time)
   * @param tokenAddress Token contract address
   * @returns Price in USD
   */
  private async fetchHermesPrice(tokenAddress: string): Promise<number> {
    const feedId = this.PYTH_FEED_IDS[tokenAddress.toLowerCase()];

    if (!feedId) {
      throw new Error(`No Pyth feed ID configured for token ${tokenAddress}`);
    }

    try {
      // Fetch from Hermes API
      const url = `${this.HERMES_API}/v2/updates/price/latest?ids[]=${feedId}&encoding=hex`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Hermes API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.parsed || data.parsed.length === 0) {
        throw new Error('No price data returned from Hermes');
      }

      const priceData = data.parsed[0].price;
      const price = parseInt(priceData.price);
      const expo = priceData.expo;
      const conf = parseInt(priceData.conf);
      const publishTime = priceData.publish_time;

      // Calculate price: price * 10^expo
      const priceUSD = price * Math.pow(10, expo);
      const confidence = conf * Math.pow(10, expo);
      const confidencePercent = (confidence / Math.abs(priceUSD)) * 100;

      // Check price freshness (warn if > 60 seconds old)
      const ageSeconds = Date.now() / 1000 - publishTime;
      if (ageSeconds > 60) {
        this.logger.warn(
          `Hermes price for ${tokenAddress} is ${ageSeconds.toFixed(0)}s old (stale)`,
        );
      }

      // Check confidence (warn if > 1%)
      if (confidencePercent > 1) {
        this.logger.warn(
          `Hermes price for ${tokenAddress} has low confidence: ±${confidencePercent.toFixed(2)}%`,
        );
      }

      this.logger.debug(
        `Hermes: ${tokenAddress} = $${priceUSD.toFixed(6)} ` +
        `(±${confidencePercent.toFixed(2)}%, ${ageSeconds.toFixed(0)}s old)`,
      );

      return priceUSD;
    } catch (error) {
      throw new Error(`Hermes API request failed: ${error.message}`);
    }
  }

  /**
   * Fetch price from OUR PythOracle wrapper (on-chain fallback)
   * @param tokenAddress Token contract address
   * @param chainName Chain name
   * @returns Price in USD
   */
  private async fetchPythPrice(
    tokenAddress: string,
    chainName: 'monad' | 'base-sepolia' | 'base-mainnet',
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
    chainName: 'monad' | 'base-sepolia' | 'base-mainnet',
  ): string | null {
    const lowerAddress = tokenAddress.toLowerCase();

    const symbolMap =
      chainName === 'monad'
        ? this.TOKEN_SYMBOLS_MONAD
        : this.TOKEN_SYMBOLS_BASE; // Both base-sepolia and base-mainnet use same tokens

    return symbolMap[lowerAddress] || null;
  }

  /**
   * Health check: verify OUR PythOracle is accessible
   */
  async healthCheck(chainName: 'monad' | 'base-sepolia' | 'base-mainnet'): Promise<boolean> {
    try {
      // Try to fetch WETH price as health check
      const tokenMap = chainName === 'monad' ? this.TOKEN_SYMBOLS_MONAD : this.TOKEN_SYMBOLS_BASE; // Both Base chains use same map
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

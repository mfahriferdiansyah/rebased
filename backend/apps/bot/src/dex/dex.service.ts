import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainService } from '@app/blockchain';
import { SupportedChain } from '@app/blockchain/chains';
import { ExecutionPlan, SwapPlan } from '../strategy/types/strategy-logic.types';
import axios, { AxiosInstance } from 'axios';
import { UniswapV2Service } from './uniswap-v2.service';
import { MonorailService } from './monorail.service';

interface SwapQuote {
  aggregator: string;
  fromToken: string;
  toToken: string;
  fromAmount: bigint;
  toAmount: bigint;
  target: string;  // Contract to call
  calldata: string;  // Transaction calldata
  estimatedGas: bigint;
  priceImpact: number;
}

interface Quote1inch {
  toAmount: string;
  tx: {
    to: string;
    data: string;
    value: string;
    gas: number;
  };
  protocols?: any[];
}

interface Quote0x {
  sellAmount: string;
  buyAmount: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
  estimatedPriceImpact: string;
}

interface ParaswapPriceRoute {
  destAmount: string;
  srcAmount: string;
  priceRoute: {
    destAmount: string;
    srcAmount: string;
  };
}

interface ParaswapTransaction {
  to: string;
  data: string;
  value: string;
}

@Injectable()
export class DexService {
  private readonly logger = new Logger(DexService.name);
  private readonly axios1inch: AxiosInstance;
  private readonly axios0x: AxiosInstance;
  private readonly axiosParaswap: AxiosInstance;

  // Rate limiting: Track last request time for each aggregator
  private lastRequest = {
    '1inch': 0,
    '0x': 0,
    'paraswap': 0,
  };

  // Minimum delay between requests (ms)
  private readonly rateLimits = {
    '1inch': 1000, // 1 req/sec
    '0x': 500, // 2 req/sec
    'paraswap': 500, // 2 req/sec
  };

  constructor(
    private readonly config: ConfigService,
    private readonly chain: ChainService,
    private readonly uniswapV2: UniswapV2Service,
    private readonly monorail: MonorailService,
  ) {
    // 1inch client with auth
    const api1inchKey = this.config.get<string>('dex.1inchApiKey');
    this.axios1inch = axios.create({
      baseURL: 'https://api.1inch.dev',
      headers: api1inchKey ? { Authorization: `Bearer ${api1inchKey}` } : {},
      timeout: 10000,
    });

    // 0x client with auth
    const api0xKey = this.config.get<string>('dex.0xApiKey');
    this.axios0x = axios.create({
      baseURL: 'https://api.0x.org',
      headers: api0xKey ? { '0x-api-key': api0xKey } : {},
      timeout: 10000,
    });

    // ParaSwap client (no auth required)
    this.axiosParaswap = axios.create({
      baseURL: 'https://apiv5.paraswap.io',
      timeout: 10000,
    });
  }

  /**
   * Get optimal swap routes from execution plan
   * Fetches quotes from all enabled aggregators and selects the best for each swap
   *
   * CHAIN-SPECIFIC ROUTING:
   * - Monad: Uses Monorail (primary) with Uniswap V2 fallback
   * - Base: Uses 1inch, 0x, ParaSwap aggregators
   */
  async getOptimalSwaps(
    executionPlan: ExecutionPlan,
    chain: SupportedChain,
    userAccount: string,
  ): Promise<any[]> {
    this.logger.debug(
      `Finding optimal routes for ${executionPlan.swaps.length} swaps on ${chain}`,
    );

    if (executionPlan.swaps.length === 0) {
      this.logger.debug('No swaps required');
      return [];
    }

    // MONAD: Use Monorail (primary) with Uniswap V2 fallback
    if (chain === 'monad') {
      this.logger.log('Using Monorail for Monad testnet (with Uniswap V2 fallback)');
      return this.getMonadSwaps(executionPlan, userAccount);
    }

    // BASE: Use aggregators (1inch, 0x, ParaSwap)
    return this.getBaseSwaps(executionPlan, chain, userAccount);
  }

  /**
   * Get token decimals from contract
   */
  private async getTokenDecimals(
    tokenAddress: string,
    chain: SupportedChain,
  ): Promise<number> {
    try {
      const client = this.chain.getPublicClient(chain as any);

      // Native token always has 18 decimals
      if (
        tokenAddress === '0x0000000000000000000000000000000000000000' ||
        tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ) {
        return 18;
      }

      const decimals = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'decimals',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'uint8' }],
          },
        ],
        functionName: 'decimals',
        args: [],
        authorizationList: undefined,
      } as any);

      return Number(decimals);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch decimals for ${tokenAddress}, defaulting to 18: ${error.message}`,
      );
      return 18; // Default fallback
    }
  }

  /**
   * Get swaps for Monad using Monorail (primary) with Uniswap V2 fallback
   *
   * NATIVE TOKEN HANDLING:
   * - Native MON (0x0000...0000) cannot be swapped directly due to contract limitation
   * - Solution: Wrap MON → WMON first, then swap WMON → target token
   * - This adds an extra step but works with current contract architecture
   */
  private async getMonadSwaps(executionPlan: ExecutionPlan, userAccount: string): Promise<any[]> {
    const allSwapData: any[] = [];
    const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';
    const WMON_ADDRESS = '0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37'; // Wrapped MON on Monad testnet

    for (const swap of executionPlan.swaps) {
      this.logger.debug(
        `Getting swap quote for Monad: ${swap.fromToken} -> ${swap.toToken}`,
      );

      // WORKAROUND: If swapping FROM native MON, wrap it first then swap WMON
      if (swap.fromToken.toLowerCase() === NATIVE_TOKEN.toLowerCase()) {
        this.logger.log('Native MON detected - will wrap to WMON first, then swap WMON');

        // Step 1: Add WRAP transaction (MON → WMON)
        // NOTE: This requires the RebalanceExecutor contract to support native value passing
        // Current contract limitation: hardcodes value=0 in DeleGator.execute() call
        // This will demonstrate the need for contract upgrade
        const wrapData = {
          fromToken: NATIVE_TOKEN,
          toToken: WMON_ADDRESS,
          target: WMON_ADDRESS, // WMON contract
          data: '0xd0e30db0', // deposit() function selector - WMON9.deposit() payable
          value: swap.fromAmount.toString(), // Amount of MON to wrap (needs contract support!)
          minOutput: swap.fromAmount, // Wrapping is 1:1
          aggregator: 'WMON Wrapper',
          priceImpact: 0,
          isWrap: true, // Flag for special handling
        };
        allSwapData.push(wrapData);
        this.logger.warn(`Added WRAP step (requires contract upgrade): ${swap.fromAmount} MON → WMON`);

        // Step 2: Get quote for WMON → target token (instead of MON → target)
        const wmonSwap = {
          ...swap,
          fromToken: WMON_ADDRESS, // Use WMON instead of native MON
        };

        let swapData: any = null;

        try {
          this.logger.debug('Trying Monorail for WMON swap...');
          const decimalsIn = await this.getTokenDecimals(wmonSwap.fromToken, 'monad');
          const monorailQuote = await this.monorail.getQuote(
            wmonSwap.fromToken,
            wmonSwap.toToken,
            wmonSwap.fromAmount,
            userAccount,
            decimalsIn,
          );

          if (monorailQuote) {
            const txData = this.monorail.buildSwapTransaction(monorailQuote);

            swapData = {
              fromToken: wmonSwap.fromToken,
              toToken: wmonSwap.toToken,
              target: txData.target,
              data: txData.calldata,
              value: '0', // No native tokens for ERC-20 swap
              minOutput: txData.minOutput,
              aggregator: 'Monorail',
              priceImpact: monorailQuote.priceImpact,
            };

            this.logger.log(
              `Monorail quote (WMON): ${monorailQuote.amountOut} output (${monorailQuote.priceImpact.toFixed(2)}% impact)`,
            );
          }
        } catch (error) {
          this.logger.warn(`Monorail quote failed for WMON: ${error.message}`);
        }

        if (!swapData) {
          this.logger.debug('Falling back to Uniswap V2 for WMON swap...');
          const uniswapQuote = await this.uniswapV2.getQuote(
            wmonSwap.fromToken,
            wmonSwap.toToken,
            wmonSwap.fromAmount,
            'monad',
          );

          if (uniswapQuote) {
            const txData = this.uniswapV2.buildSwapTransaction(
              uniswapQuote,
              userAccount,
              100,
            );

            swapData = {
              fromToken: wmonSwap.fromToken,
              toToken: wmonSwap.toToken,
              target: txData.target,
              data: txData.calldata,
              value: '0', // No native tokens for ERC-20 swap
              minOutput: txData.minOutput,
              aggregator: 'Uniswap V2 (Fallback)',
              priceImpact: uniswapQuote.priceImpact,
            };

            this.logger.log(
              `Uniswap V2 fallback quote (WMON): ${uniswapQuote.amountOut} output (${uniswapQuote.priceImpact.toFixed(2)}% impact)`,
            );
          }
        }

        if (swapData) {
          allSwapData.push(swapData);
        } else {
          this.logger.error(`Failed to get quote for WMON->${swap.toToken}`);
          throw new Error(`No quotes available for WMON->${swap.toToken}`);
        }

        continue; // Skip to next swap
      }

      // NORMAL PATH: Non-native token swaps
      let swapData: any = null;

      // Try Monorail first (primary DEX for Monad)
      try {
        this.logger.debug('Trying Monorail...');
        const decimalsIn = await this.getTokenDecimals(swap.fromToken, 'monad');
        const monorailQuote = await this.monorail.getQuote(
          swap.fromToken,
          swap.toToken,
          swap.fromAmount,
          userAccount,
          decimalsIn,
        );

        if (monorailQuote) {
          const txData = this.monorail.buildSwapTransaction(monorailQuote);

          swapData = {
            fromToken: swap.fromToken,
            toToken: swap.toToken,
            target: txData.target,
            data: txData.calldata,
            value: txData.value || '0',
            minOutput: txData.minOutput,
            aggregator: 'Monorail',
            priceImpact: monorailQuote.priceImpact,
          };

          this.logger.log(
            `Monorail quote: ${monorailQuote.amountOut} output (${monorailQuote.priceImpact.toFixed(2)}% impact)`,
          );
        }
      } catch (error) {
        this.logger.warn(`Monorail quote failed: ${error.message}`);
      }

      // Fallback to Uniswap V2 if Monorail fails
      if (!swapData) {
        this.logger.debug('Falling back to Uniswap V2...');
        const uniswapQuote = await this.uniswapV2.getQuote(
          swap.fromToken,
          swap.toToken,
          swap.fromAmount,
          'monad',
        );

        if (uniswapQuote) {
          const txData = this.uniswapV2.buildSwapTransaction(
            uniswapQuote,
            userAccount,
            100, // 1% slippage
          );

          swapData = {
            fromToken: swap.fromToken,
            toToken: swap.toToken,
            target: txData.target,
            data: txData.calldata,
            value: '0',
            minOutput: txData.minOutput,
            aggregator: 'Uniswap V2 (Fallback)',
            priceImpact: uniswapQuote.priceImpact,
          };

          this.logger.log(
            `Uniswap V2 fallback quote: ${uniswapQuote.amountOut} output (${uniswapQuote.priceImpact.toFixed(2)}% impact)`,
          );
        }
      }

      if (swapData) {
        allSwapData.push(swapData);
      } else {
        this.logger.error(`Failed to get quote from any DEX for ${swap.fromToken}->${swap.toToken}`);
        throw new Error(`No quotes available for ${swap.fromToken}->${swap.toToken}`);
      }
    }

    return allSwapData;
  }

  /**
   * Get swaps for Base using aggregators
   */
  private async getBaseSwaps(
    executionPlan: ExecutionPlan,
    chain: SupportedChain,
    userAccount: string,
  ): Promise<any[]> {
    // Get enabled aggregators
    const enabled1inch = this.config.get<boolean>('dex.enable1inch', true);
    const enabled0x = this.config.get<boolean>('dex.enable0x', true);
    const enabledParaswap = this.config.get<boolean>('dex.enableParaswap', true);
    const enabledUniswap = this.config.get<boolean>('dex.enableUniswap', true);

    try {
      const allSwapData: any[] = [];

      for (const swap of executionPlan.swaps) {
        this.logger.debug(
          `Getting quotes for swap: ${swap.fromToken} -> ${swap.toToken} (${swap.fromAmount})`,
        );

        const swapQuotes: SwapQuote[] = [];

        // Fetch quotes from all enabled aggregators in parallel
        const quotePromises: Promise<SwapQuote | null>[] = [];

        if (enabled1inch) {
          quotePromises.push(this.get1inchQuote(swap, chain, userAccount));
        }
        if (enabled0x) {
          quotePromises.push(this.get0xQuote(swap, chain, userAccount));
        }
        if (enabledParaswap) {
          quotePromises.push(this.getParaswapQuote(swap, chain, userAccount));
        }
        if (enabledUniswap && this.uniswapV2.isAvailable(chain)) {
          quotePromises.push(this.getUniswapQuote(swap, chain, userAccount));
        }

        // Wait for all quotes
        const results = await Promise.allSettled(quotePromises);

        // Collect successful quotes
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            swapQuotes.push(result.value);
          } else if (result.status === 'rejected') {
            this.logger.warn(`Quote ${index} failed: ${result.reason}`);
          }
        });

        // Select best quote for this swap
        const bestQuote = this.selectBestQuote(swapQuotes);

        if (bestQuote) {
          this.logger.log(
            `Best quote for ${swap.fromToken}->${swap.toToken}: ${bestQuote.aggregator}` +
            ` - Output: ${bestQuote.toAmount} (${bestQuote.priceImpact.toFixed(2)}% impact)`,
          );

          // Convert to format expected by executor
          allSwapData.push({
            fromToken: swap.fromToken,
            toToken: swap.toToken,
            target: bestQuote.target,
            data: bestQuote.calldata,
            minOutput: bestQuote.toAmount,
            aggregator: bestQuote.aggregator,
            priceImpact: bestQuote.priceImpact,
          });
        } else {
          this.logger.error(
            `No acceptable quotes found for swap ${swap.fromToken}->${swap.toToken}`,
          );
          throw new Error(`No acceptable quotes for ${swap.fromToken}->${swap.toToken}`);
        }
      }

      return allSwapData;
    } catch (error) {
      this.logger.error(`Error getting swap quotes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get quote from 1inch aggregator
   */
  private async get1inchQuote(
    swap: SwapPlan,
    chain: SupportedChain,
    userAccount: string,
  ): Promise<SwapQuote | null> {
    try {
      // Rate limit check
      await this.rateLimit('1inch');

      const chainId = chain === 'monad' ? 10143 : 84532;
      const apiKey = this.config.get<string>('dex.1inchApiKey');

      if (!apiKey) {
        this.logger.warn('1inch API key not configured');
        return null;
      }

      this.logger.debug('Fetching 1inch quote...');

      const response = await this.axios1inch.get<Quote1inch>(
        `/swap/v6.0/${chainId}/quote`,
        {
          params: {
            src: swap.fromToken,
            dst: swap.toToken,
            amount: swap.fromAmount.toString(),
            from: userAccount,
            slippage: '1', // 1% slippage
            disableEstimate: 'false',
            includeProtocols: 'true',
          },
        },
      );

      const data = response.data;

      // Calculate price impact
      const priceImpact = this.calculatePriceImpact(
        swap.fromAmount,
        BigInt(data.toAmount),
        swap.fromToken,
        swap.toToken,
      );

      return {
        aggregator: '1inch',
        fromToken: swap.fromToken,
        toToken: swap.toToken,
        fromAmount: swap.fromAmount,
        toAmount: BigInt(data.toAmount),
        target: data.tx.to,
        calldata: data.tx.data,
        estimatedGas: BigInt(data.tx.gas),
        priceImpact,
      };
    } catch (error) {
      this.logger.error(`1inch quote failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get quote from 0x aggregator
   */
  private async get0xQuote(
    swap: SwapPlan,
    chain: SupportedChain,
    userAccount: string,
  ): Promise<SwapQuote | null> {
    try {
      // Rate limit check
      await this.rateLimit('0x');

      const apiKey = this.config.get<string>('dex.0xApiKey');

      if (!apiKey) {
        this.logger.warn('0x API key not configured');
        return null;
      }

      // 0x only supports certain chains
      if (chain === 'monad') {
        this.logger.debug('0x does not support Monad');
        return null;
      }

      this.logger.debug('Fetching 0x quote...');

      const response = await this.axios0x.get<Quote0x>(
        '/swap/v1/quote',
        {
          params: {
            sellToken: swap.fromToken,
            buyToken: swap.toToken,
            sellAmount: swap.fromAmount.toString(),
            takerAddress: userAccount,
            slippagePercentage: '0.01', // 1%
          },
        },
      );

      const data = response.data;

      const priceImpact = parseFloat(data.estimatedPriceImpact) * 100;

      return {
        aggregator: '0x',
        fromToken: swap.fromToken,
        toToken: swap.toToken,
        fromAmount: swap.fromAmount,
        toAmount: BigInt(data.buyAmount),
        target: data.to,
        calldata: data.data,
        estimatedGas: BigInt(data.gas),
        priceImpact,
      };
    } catch (error) {
      this.logger.error(`0x quote failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get quote from ParaSwap aggregator
   */
  private async getParaswapQuote(
    swap: SwapPlan,
    chain: SupportedChain,
    userAccount: string,
  ): Promise<SwapQuote | null> {
    try {
      // Rate limit check
      await this.rateLimit('paraswap');

      const network = chain === 'monad' ? 10143 : 84532;

      this.logger.debug('Fetching ParaSwap quote...');

      // Step 1: Get price route
      const priceResponse = await this.axiosParaswap.get<ParaswapPriceRoute>(
        '/prices',
        {
          params: {
            srcToken: swap.fromToken,
            destToken: swap.toToken,
            amount: swap.fromAmount.toString(),
            srcDecimals: 18,  // Assuming 18 decimals
            destDecimals: 18,
            side: 'SELL',
            network,
          },
        },
      );

      const priceRoute = priceResponse.data.priceRoute;

      // Step 2: Build transaction
      const txResponse = await this.axiosParaswap.post<ParaswapTransaction>(
        '/transactions/{network}',
        {
          srcToken: swap.fromToken,
          destToken: swap.toToken,
          srcAmount: swap.fromAmount.toString(),
          destAmount: priceRoute.destAmount,
          priceRoute,
          userAddress: userAccount,
          partner: 'rebased',
          slippage: 100, // 1% in basis points
        },
        {
          params: { network },
        },
      );

      const txData = txResponse.data;

      const priceImpact = this.calculatePriceImpact(
        swap.fromAmount,
        BigInt(priceRoute.destAmount),
        swap.fromToken,
        swap.toToken,
      );

      return {
        aggregator: 'ParaSwap',
        fromToken: swap.fromToken,
        toToken: swap.toToken,
        fromAmount: swap.fromAmount,
        toAmount: BigInt(priceRoute.destAmount),
        target: txData.to,
        calldata: txData.data,
        estimatedGas: 300000n, // ParaSwap doesn't provide gas estimate
        priceImpact,
      };
    } catch (error) {
      this.logger.error(`ParaSwap quote failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get quote from Uniswap V2 (fallback for Base, not used for Monad)
   */
  private async getUniswapQuote(
    swap: SwapPlan,
    chain: SupportedChain,
    userAccount: string,
  ): Promise<SwapQuote | null> {
    try {
      this.logger.debug('Getting Uniswap V2 quote...');

      const quote = await this.uniswapV2.getQuote(
        swap.fromToken,
        swap.toToken,
        swap.fromAmount,
        chain,
      );

      if (!quote) return null;

      const txData = this.uniswapV2.buildSwapTransaction(
        quote,
        userAccount,
        100, // 1% slippage
      );

      return {
        aggregator: 'Uniswap V2',
        fromToken: swap.fromToken,
        toToken: swap.toToken,
        fromAmount: swap.fromAmount,
        toAmount: quote.amountOut,
        target: txData.target,
        calldata: txData.calldata,
        estimatedGas: 200000n, // Typical Uniswap V2 swap gas
        priceImpact: quote.priceImpact,
      };
    } catch (error) {
      this.logger.error(`Uniswap V2 quote failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Select the best quote based on output amount and price impact
   */
  private selectBestQuote(quotes: SwapQuote[]): SwapQuote | null {
    if (quotes.length === 0) return null;

    // Filter out quotes with excessive price impact
    const maxPriceImpact = this.config.get<number>('bot.maxPriceImpact', 3); // 3% default
    const acceptableQuotes = quotes.filter((q) => q.priceImpact <= maxPriceImpact);

    if (acceptableQuotes.length === 0) {
      this.logger.warn(
        `All quotes exceed max price impact of ${maxPriceImpact}%. ` +
        `Best was: ${Math.min(...quotes.map(q => q.priceImpact)).toFixed(2)}%`,
      );
      return null;
    }

    // Select quote with highest output amount
    const best = acceptableQuotes.reduce((best, current) =>
      current.toAmount > best.toAmount ? current : best,
    );

    this.logger.debug(
      `Selected ${best.aggregator}: ${best.toAmount} output (${best.priceImpact.toFixed(2)}% impact)`,
    );

    return best;
  }

  /**
   * Calculate price impact for a swap
   */
  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    tokenIn: string,
    tokenOut: string,
  ): number {
    // Simplified calculation - in production, fetch actual prices from oracle
    // For now, assume 1:1 pricing and calculate based on amount difference
    const inValue = Number(amountIn) / 1e18;
    const outValue = Number(amountOut) / 1e18;

    // Price impact = (expected - actual) / expected * 100
    const priceImpact = Math.abs((inValue - outValue) / inValue) * 100;

    return priceImpact;
  }

  /**
   * Rate limiting helper
   */
  private async rateLimit(aggregator: '1inch' | '0x' | 'paraswap'): Promise<void> {
    const now = Date.now();
    const lastReq = this.lastRequest[aggregator];
    const minDelay = this.rateLimits[aggregator];

    const timeSinceLastReq = now - lastReq;

    if (timeSinceLastReq < minDelay) {
      const delay = minDelay - timeSinceLastReq;
      this.logger.debug(`Rate limiting ${aggregator}: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequest[aggregator] = Date.now();
  }

  /**
   * Validate swap execution (pre-flight checks)
   */
  async validateSwap(quote: SwapQuote, userAccount: string): Promise<boolean> {
    try {
      // TODO: Implement comprehensive validation
      // - Check token balances
      // - Check allowances
      // - Simulate transaction
      // - Verify slippage tolerance

      this.logger.debug(`Validating swap: ${quote.aggregator}`);

      // Basic validation
      if (quote.toAmount === 0n) {
        this.logger.error('Invalid quote: zero output amount');
        return false;
      }

      if (!quote.target || !quote.calldata) {
        this.logger.error('Invalid quote: missing target or calldata');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Swap validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get aggregator status (health check)
   */
  async getAggregatorStatus(): Promise<{
    '1inch': boolean;
    '0x': boolean;
    'paraswap': boolean;
    'uniswap': boolean;
    'monorail': boolean;
  }> {
    const status = {
      '1inch': false,
      '0x': false,
      'paraswap': false,
      'uniswap': false,
      'monorail': false,
    };

    // Test each aggregator with a dummy request
    try {
      await this.axios1inch.get('/swap/v6.0/1/healthcheck');
      status['1inch'] = true;
    } catch (e) {
      this.logger.warn('1inch health check failed');
    }

    try {
      await this.axios0x.get('/swap/v1/quote', {
        params: {
          sellToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          buyToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          sellAmount: '1000000000000000000',
        },
        validateStatus: () => true,
      });
      status['0x'] = true;
    } catch (e) {
      this.logger.warn('0x health check failed');
    }

    try {
      await this.axiosParaswap.get('/prices', {
        params: {
          srcToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          destToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          amount: '1000000000000000000',
          network: 1,
        },
        validateStatus: () => true,
      });
      status['paraswap'] = true;
    } catch (e) {
      this.logger.warn('ParaSwap health check failed');
    }

    try {
      status['monorail'] = await this.monorail.healthCheck();
    } catch (e) {
      this.logger.warn('Monorail health check failed');
    }

    return status;
  }
}

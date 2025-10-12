import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupportedChain } from '@app/blockchain/chains';
import { ExecutionPlan, SwapPlan } from '../strategy/types/strategy-logic.types';

interface SwapQuote {
  aggregator: string;
  fromToken: string;
  toToken: string;
  fromAmount: bigint;
  toAmount: bigint;
  calldata: string;
  estimatedGas: bigint;
  priceImpact: number;
}

@Injectable()
export class DexService {
  private readonly logger = new Logger(DexService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Get optimal swap routes from execution plan
   */
  async getOptimalSwaps(
    executionPlan: ExecutionPlan,
    chain: SupportedChain,
  ): Promise<SwapQuote[]> {
    this.logger.debug(
      `Finding optimal routes for ${executionPlan.swaps.length} swaps on ${chain}`,
    );

    if (executionPlan.swaps.length === 0) {
      this.logger.debug('No swaps required');
      return [];
    }

    // Get enabled aggregators
    const enabled1inch = this.config.get<boolean>('dex.enable1inch', true);
    const enabled0x = this.config.get<boolean>('dex.enable0x', true);
    const enabledParaswap = this.config.get<boolean>('dex.enableParaswap', true);
    const enabledUniswap = this.config.get<boolean>('dex.enableUniswap', true);

    try {
      // Get quotes for each swap in the execution plan
      const allQuotes: SwapQuote[] = [];

      for (const swap of executionPlan.swaps) {
        this.logger.debug(
          `Getting quotes for swap: ${swap.fromToken} -> ${swap.toToken}`,
        );

        const swapQuotes: SwapQuote[] = [];

        if (enabled1inch) {
          const quote1inch = await this.get1inchQuote(swap, chain);
          if (quote1inch) swapQuotes.push(quote1inch);
        }

        if (enabled0x) {
          const quote0x = await this.get0xQuote(swap, chain);
          if (quote0x) swapQuotes.push(quote0x);
        }

        if (enabledParaswap) {
          const quoteParaswap = await this.getParaswapQuote(swap, chain);
          if (quoteParaswap) swapQuotes.push(quoteParaswap);
        }

        if (enabledUniswap) {
          const quoteUniswap = await this.getUniswapQuote(swap, chain);
          if (quoteUniswap) swapQuotes.push(quoteUniswap);
        }

        // Select best quote for this swap
        const bestQuote = this.selectBestQuote(swapQuotes);
        if (bestQuote) {
          this.logger.log(
            `Best quote for ${swap.fromToken}->${swap.toToken}: ${bestQuote.aggregator} - Output: ${bestQuote.toAmount}`,
          );
          allQuotes.push(bestQuote);
        } else {
          this.logger.warn(
            `No acceptable quotes found for swap ${swap.fromToken}->${swap.toToken}`,
          );
        }
      }

      return allQuotes;
    } catch (error) {
      this.logger.error(`Error getting swap quotes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get quote from 1inch
   */
  private async get1inchQuote(
    swap: SwapPlan,
    chain: SupportedChain,
  ): Promise<SwapQuote | null> {
    const apiKey = this.config.get<string>('dex.1inchApiKey');
    if (!apiKey) {
      this.logger.warn('1inch API key not configured');
      return null;
    }

    // TODO: Implement 1inch API integration
    // https://portal.1inch.dev/documentation/apis/swap/v6.0
    // Request: GET /swap/v6.0/{chain}/quote?src={fromToken}&dst={toToken}&amount={fromAmount}
    this.logger.debug('Getting 1inch quote...');

    return null;
  }

  /**
   * Get quote from 0x
   */
  private async get0xQuote(
    swap: SwapPlan,
    chain: SupportedChain,
  ): Promise<SwapQuote | null> {
    const apiKey = this.config.get<string>('dex.0xApiKey');
    if (!apiKey) {
      this.logger.warn('0x API key not configured');
      return null;
    }

    // TODO: Implement 0x API integration
    // https://0x.org/docs/api
    // Request: GET /swap/v1/quote?sellToken={fromToken}&buyToken={toToken}&sellAmount={fromAmount}
    this.logger.debug('Getting 0x quote...');

    return null;
  }

  /**
   * Get quote from ParaSwap
   */
  private async getParaswapQuote(
    swap: SwapPlan,
    chain: SupportedChain,
  ): Promise<SwapQuote | null> {
    // ParaSwap doesn't require API key for basic usage
    // TODO: Implement ParaSwap API integration
    // https://developers.paraswap.network/api/get-rate
    // Request: GET /prices?srcToken={fromToken}&destToken={toToken}&amount={fromAmount}&network={chain}
    this.logger.debug('Getting ParaSwap quote...');

    return null;
  }

  /**
   * Get quote from Uniswap V3
   */
  private async getUniswapQuote(
    swap: SwapPlan,
    chain: SupportedChain,
  ): Promise<SwapQuote | null> {
    // Direct on-chain integration with Uniswap V3 Quoter
    // TODO: Implement Uniswap V3 Quoter integration
    // Call QuoterV2.quoteExactInputSingle with swap parameters
    this.logger.debug('Getting Uniswap quote...');

    return null;
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
        `All quotes exceed max price impact of ${maxPriceImpact}%`,
      );
      return null;
    }

    // Select quote with highest output amount
    return acceptableQuotes.reduce((best, current) =>
      current.toAmount > best.toAmount ? current : best,
    );
  }

  /**
   * Validate swap execution
   */
  async validateSwap(quote: SwapQuote): Promise<boolean> {
    // TODO: Implement swap validation
    // - Check token balances
    // - Check allowances
    // - Simulate transaction
    // - Verify slippage tolerance
    return true;
  }
}

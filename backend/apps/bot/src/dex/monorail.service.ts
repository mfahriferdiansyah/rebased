import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface MonorailQuote {
  amountOut: bigint;
  minOutput: bigint;
  target: string;
  calldata: string;
  value: string;
  priceImpact: number;
  gasEstimate: bigint;
  quoteId: string;
}

interface MonorailQuoteResponse {
  quote_id: string;
  from: string;
  to: string;
  input: string;
  input_formatted: string;
  output: string;
  output_formatted: string;
  min_output: string;
  min_output_formatted: string;
  compound_impact: string;
  gas_estimate: number;
  transaction: {
    to: string;
    data: string;
    value: string;
  };
  hops: number;
  block: number;
  generated_at: number;
  referrer_id: string;
  fees: {
    protocol_bps: number;
    protocol_amount: string;
    fee_share_bps: number;
    fee_share_amount: string;
  };
  routes: any[];
}

/**
 * Monorail DEX integration for Monad testnet
 * Primary DEX choice for Monad with smart routing and aggregation
 *
 * API Docs: https://testnet-preview.monorail.xyz/developers
 * GitHub: https://github.com/monorail-xyz
 */
@Injectable()
export class MonorailService {
  private readonly logger = new Logger(MonorailService.name);
  private readonly axios: AxiosInstance;
  private readonly APP_ID = 'rebased';

  // Base URLs for Monorail APIs
  private readonly PATHFINDER_URL = 'https://testnet-pathfinder.monorail.xyz/v4';
  private readonly DATA_URL = 'https://testnet-api.monorail.xyz/v1';

  constructor(private readonly config: ConfigService) {
    this.axios = axios.create({
      timeout: 15000,
    });
  }

  /**
   * Get quote from Monorail Pathfinder API
   */
  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    userAccount: string,
    decimalsIn: number = 18,
  ): Promise<MonorailQuote | null> {
    try {
      // Check if Monorail is disabled (for testing Uniswap V2 fallback with smaller calldata)
      const isDisabled = this.config.get<string>('DISABLE_MONORAIL') === 'true';
      if (isDisabled) {
        this.logger.warn('Monorail is disabled via DISABLE_MONORAIL flag - falling back to Uniswap V2');
        throw new Error('Monorail disabled for calldata size testing');
      }

      // Convert bigint amount to human-readable decimal format
      const amountFormatted = this.formatAmount(amountIn, decimalsIn);

      this.logger.debug(
        `Getting Monorail quote: ${tokenIn} -> ${tokenOut} (${amountFormatted})`,
      );

      const response = await this.axios.get<MonorailQuoteResponse>(
        `${this.PATHFINDER_URL}/quote`,
        {
          params: {
            source: this.APP_ID,
            from: tokenIn,
            to: tokenOut,
            amount: amountFormatted,
            sender: userAccount,
            max_slippage: 500, // 5% slippage (500 basis points) - increased for testing
            deadline: 1800, // 30 minutes (in seconds)
          },
        },
      );

      const data = response.data;

      // Parse price impact from compound_impact string (e.g., "0.45" = 0.45%)
      const priceImpact = parseFloat(data.compound_impact);

      this.logger.log(
        `Monorail quote: ${data.output_formatted} ${data.to} (${priceImpact.toFixed(2)}% impact, ${data.hops} hops)`,
      );

      return {
        amountOut: BigInt(data.output),
        minOutput: BigInt(data.min_output),
        target: data.transaction.to,
        calldata: data.transaction.data,
        value: data.transaction.value,
        priceImpact,
        gasEstimate: BigInt(data.gas_estimate),
        quoteId: data.quote_id,
      };
    } catch (error) {
      this.logger.error(`Monorail quote failed: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`Monorail error details: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Build swap transaction from quote
   */
  buildSwapTransaction(
    quote: MonorailQuote,
  ): {
    target: string;
    calldata: string;
    value: string;
    minOutput: bigint;
  } {
    return {
      target: quote.target,
      calldata: quote.calldata,
      value: quote.value,
      minOutput: quote.minOutput,
    };
  }

  /**
   * Get token information from Monorail Data API
   */
  async getTokenInfo(tokenAddress: string): Promise<any> {
    try {
      const response = await this.axios.get(
        `${this.DATA_URL}/token/${tokenAddress}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get token info: ${error.message}`);
      return null;
    }
  }

  /**
   * Search for tokens
   */
  async findTokens(query: string, walletAddress?: string): Promise<any[]> {
    try {
      const response = await this.axios.get(
        `${this.DATA_URL}/tokens`,
        {
          params: {
            find: query,
            address: walletAddress,
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to find tokens: ${error.message}`);
      return [];
    }
  }

  /**
   * Get wallet balances
   */
  async getWalletBalances(address: string): Promise<any[]> {
    try {
      const response = await this.axios.get(
        `${this.DATA_URL}/wallet/${address}/balances`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get wallet balances: ${error.message}`);
      return [];
    }
  }

  /**
   * Get portfolio value in USD
   */
  async getPortfolioValue(address: string): Promise<string | null> {
    try {
      const response = await this.axios.get(
        `${this.DATA_URL}/portfolio/${address}/value`,
      );
      return response.data.value;
    } catch (error) {
      this.logger.error(`Failed to get portfolio value: ${error.message}`);
      return null;
    }
  }

  /**
   * Format amount from bigint to human-readable decimal string
   */
  private formatAmount(amount: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const remainder = amount % divisor;

    // Convert remainder to decimal with proper padding
    const remainderStr = remainder.toString().padStart(decimals, '0');

    // Trim trailing zeros
    const trimmed = remainderStr.replace(/0+$/, '');

    if (trimmed === '') {
      return whole.toString();
    }

    return `${whole}.${trimmed}`;
  }

  /**
   * Check if Monorail is available (always true for Monad testnet)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Health check for Monorail API
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get MON price as a health check
      const response = await this.axios.get(
        `${this.DATA_URL}/symbol/MONUSD`,
        { timeout: 5000 },
      );
      return !!response.data?.price;
    } catch (error) {
      this.logger.warn('Monorail health check failed');
      return false;
    }
  }
}

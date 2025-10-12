import { Injectable, Logger } from '@nestjs/common';
import { ChainService } from '@app/blockchain';
import { ConfigService } from '@nestjs/config';
import { CanvasStrategy, PortfolioState, AssetBlock } from './types/strategy-logic.types';
import { StrategyParserService } from './strategy-parser.service';

@Injectable()
export class PortfolioAnalyzerService {
  private readonly logger = new Logger(PortfolioAnalyzerService.name);

  constructor(
    private readonly chain: ChainService,
    private readonly config: ConfigService,
    private readonly parser: StrategyParserService,
  ) {}

  /**
   * Analyze complete portfolio state
   * Gets balances, prices, and calculates drift
   */
  async analyzePortfolio(
    strategy: CanvasStrategy,
    userAddress: string,
    chainId: number,
  ): Promise<PortfolioState> {
    const chainName = chainId === 10143 || chainId === 10200 ? 'monad' : 'base';
    const assetBlocks = this.parser.getAssetBlocks(strategy);
    const targetWeights = this.parser.getTargetWeights(strategy);

    this.logger.debug(
      `Analyzing portfolio for ${userAddress} on ${chainName} (${assetBlocks.length} assets)`,
    );

    // Get balances and prices for all tokens
    const tokens = await Promise.all(
      assetBlocks.map((block) =>
        this.analyzeToken(block, userAddress, chainName, targetWeights),
      ),
    );

    // Calculate total portfolio value
    const totalValueUSD = tokens.reduce((sum, token) => sum + token.valueUSD, 0);

    // Calculate current weights
    tokens.forEach((token) => {
      token.currentWeight = totalValueUSD > 0 ? (token.valueUSD / totalValueUSD) * 100 : 0;
    });

    // Calculate drift (maximum deviation from target)
    const drift = this.calculateDrift(tokens);

    return {
      tokens,
      totalValueUSD,
      drift,
    };
  }

  /**
   * Analyze individual token
   */
  private async analyzeToken(
    assetBlock: AssetBlock,
    userAddress: string,
    chainName: string,
    targetWeights: Map<string, number>,
  ): Promise<PortfolioState['tokens'][0]> {
    const { address, symbol, decimals } = assetBlock.data;
    const targetWeight = targetWeights.get(address.toLowerCase()) || 0;

    try {
      // Get token balance
      const balance = await this.getTokenBalance(address, userAddress, chainName);

      // Get token price in USD
      const priceUSD = await this.getTokenPrice(address, chainName);

      // Calculate USD value
      const balanceNumber = Number(balance) / 10 ** decimals;
      const valueUSD = balanceNumber * priceUSD;

      return {
        address: address.toLowerCase(),
        symbol,
        balance,
        decimals,
        priceUSD,
        valueUSD,
        currentWeight: 0, // Calculated after all tokens are analyzed
        targetWeight,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze token ${symbol} (${address}): ${error.message}`,
      );

      // Return zero values on error
      return {
        address: address.toLowerCase(),
        symbol,
        balance: 0n,
        decimals,
        priceUSD: 0,
        valueUSD: 0,
        currentWeight: 0,
        targetWeight,
      };
    }
  }

  /**
   * Get token balance for user
   */
  private async getTokenBalance(
    tokenAddress: string,
    userAddress: string,
    chainName: string,
  ): Promise<bigint> {
    try {
      const client = this.chain.getPublicClient(chainName);

      // Handle native token (ETH)
      if (
        tokenAddress === '0x0000000000000000000000000000000000000000' ||
        tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ) {
        const balance = await client.getBalance({
          address: userAddress as `0x${string}`,
        });
        return balance;
      }

      // ERC-20 token
      const balance = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      });

      return balance as bigint;
    } catch (error) {
      this.logger.error(
        `Failed to get balance for ${tokenAddress}: ${error.message}`,
      );
      return 0n;
    }
  }

  /**
   * Get token price in USD
   * TODO: Integrate with Pyth oracle or price feeds
   */
  private async getTokenPrice(
    tokenAddress: string,
    chainName: string,
  ): Promise<number> {
    try {
      // TODO: Integrate with Pyth Network oracle
      // For now, return mock prices for testing

      const lowerAddress = tokenAddress.toLowerCase();

      // Mock prices (replace with real oracle integration)
      const mockPrices: Record<string, number> = {
        '0x0000000000000000000000000000000000000000': 2000, // ETH
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 2000, // ETH
        // Add more mock prices as needed
      };

      const price = mockPrices[lowerAddress] || 1; // Default to $1 for stablecoins

      this.logger.debug(`Mock price for ${tokenAddress}: $${price}`);
      return price;
    } catch (error) {
      this.logger.error(
        `Failed to get price for ${tokenAddress}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Calculate portfolio drift in basis points
   * Returns maximum deviation from target weights
   */
  private calculateDrift(
    tokens: PortfolioState['tokens'],
  ): number {
    let maxDrift = 0;

    for (const token of tokens) {
      const drift = Math.abs(token.currentWeight - token.targetWeight);
      maxDrift = Math.max(maxDrift, drift);
    }

    // Convert percentage to basis points (1% = 100 basis points)
    return Math.round(maxDrift * 100);
  }

  /**
   * Check if portfolio needs rebalancing
   */
  needsRebalancing(
    portfolioState: PortfolioState,
    driftThreshold: number,
  ): boolean {
    return portfolioState.drift >= driftThreshold;
  }

  /**
   * Get portfolio summary for logging
   */
  getPortfolioSummary(portfolioState: PortfolioState): string {
    const lines = [
      `Total Value: $${portfolioState.totalValueUSD.toFixed(2)}`,
      `Drift: ${(portfolioState.drift / 100).toFixed(2)}%`,
      'Assets:',
    ];

    portfolioState.tokens.forEach((token) => {
      const balanceFormatted = (Number(token.balance) / 10 ** token.decimals).toFixed(4);
      lines.push(
        `  ${token.symbol}: ${balanceFormatted} ($${token.valueUSD.toFixed(2)}) - ` +
        `Current: ${token.currentWeight.toFixed(2)}% / Target: ${token.targetWeight.toFixed(2)}%`,
      );
    });

    return lines.join('\n');
  }
}

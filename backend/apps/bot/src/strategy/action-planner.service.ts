import { Injectable, Logger } from '@nestjs/common';
import {
  CanvasStrategy,
  PortfolioState,
  ExecutionPlan,
  SwapPlan,
  ActionBlock,
} from './types/strategy-logic.types';
import { StrategyParserService } from './strategy-parser.service';

@Injectable()
export class ActionPlannerService {
  private readonly logger = new Logger(ActionPlannerService.name);

  constructor(private readonly parser: StrategyParserService) {}

  /**
   * Generate execution plan based on strategy actions
   */
  async generateExecutionPlan(
    strategy: CanvasStrategy,
    portfolioState: PortfolioState,
    conditionsMet: boolean,
  ): Promise<ExecutionPlan> {
    const actionBlocks = this.parser.getActionBlocks(strategy);

    if (actionBlocks.length === 0) {
      return {
        swaps: [],
        transfers: [],
        estimatedGas: 0n,
        shouldExecute: false,
        reason: 'No action blocks in strategy',
      };
    }

    this.logger.debug(`Planning actions for ${actionBlocks.length} action blocks`);

    const swaps: SwapPlan[] = [];
    const transfers: ExecutionPlan['transfers'] = [];

    for (const action of actionBlocks) {
      switch (action.data.actionType) {
        case 'rebalance':
          // Generate swaps to rebalance portfolio
          const rebalanceSwaps = this.planRebalanceSwaps(
            portfolioState,
            strategy,
          );
          swaps.push(...rebalanceSwaps);
          break;

        case 'swap':
          // Direct swap action
          const swapPlan = this.planSwapAction(action, portfolioState);
          if (swapPlan) swaps.push(swapPlan);
          break;

        case 'transfer':
          // Transfer action
          const transfer = this.planTransferAction(action, portfolioState);
          if (transfer) transfers.push(transfer);
          break;

        default:
          this.logger.warn(`Unknown action type: ${action.data.actionType}`);
      }
    }

    // Estimate gas (rough estimate: 150k per swap + 50k per transfer)
    const estimatedGas =
      BigInt(swaps.length * 150000 + transfers.length * 50000);

    // Separate rebalance swaps from conditional actions
    // Rebalance = portfolio maintenance (always execute)
    // Transfers/Swaps = tactical actions (require conditions)
    const hasRebalanceSwaps = swaps.some((s) => s.reason === 'rebalance');
    const hasConditionalActions =
      swaps.some((s) => s.reason === 'swap_action') || transfers.length > 0;

    // Rebalance always executes (portfolio maintenance)
    // Other actions require conditions to be met
    const shouldExecute =
      hasRebalanceSwaps || (conditionsMet && hasConditionalActions);

    const reason = this.getExecutionReason(
      conditionsMet,
      swaps,
      transfers,
      hasRebalanceSwaps,
    );

    return {
      swaps,
      transfers,
      estimatedGas,
      shouldExecute,
      reason,
    };
  }

  /**
   * Plan swaps needed to rebalance portfolio to target weights
   */
  private planRebalanceSwaps(
    portfolioState: PortfolioState,
    strategy: CanvasStrategy,
  ): SwapPlan[] {
    const swaps: SwapPlan[] = [];
    const targetWeights = this.parser.getTargetWeights(strategy);

    // Calculate which tokens to sell and which to buy
    const adjustments: Array<{
      token: PortfolioState['tokens'][0];
      deltaUSD: number; // Negative = sell, positive = buy
    }> = [];

    portfolioState.tokens.forEach((token) => {
      const targetWeight = targetWeights.get(token.address) || 0;
      const targetValueUSD =
        (portfolioState.totalValueUSD * targetWeight) / 100;
      const deltaUSD = targetValueUSD - token.valueUSD;

      if (Math.abs(deltaUSD) > 1) {
        // Only adjust if difference > $1
        adjustments.push({ token, deltaUSD });
      }
    });

    // Sort by delta (most oversold first, then most overbought)
    adjustments.sort((a, b) => a.deltaUSD - b.deltaUSD);

    // Match oversold with overbought tokens
    const toSell = adjustments.filter((a) => a.deltaUSD < 0);
    const toBuy = adjustments.filter((a) => a.deltaUSD > 0);

    for (let i = 0; i < Math.min(toSell.length, toBuy.length); i++) {
      const sellToken = toSell[i].token;
      const buyToken = toBuy[i].token;
      const amountUSD = Math.min(
        Math.abs(toSell[i].deltaUSD),
        toBuy[i].deltaUSD,
      );

      // Convert USD to token amounts
      const fromAmount = this.usdToTokenAmount(
        amountUSD,
        sellToken.priceUSD,
        sellToken.decimals,
      );
      const expectedToAmount = this.usdToTokenAmount(
        amountUSD,
        buyToken.priceUSD,
        buyToken.decimals,
      );

      swaps.push({
        fromToken: sellToken.address,
        toToken: buyToken.address,
        fromAmount,
        expectedToAmount,
        reason: 'rebalance',
      });

      this.logger.debug(
        `Planned swap: ${sellToken.symbol} → ${buyToken.symbol} ($${amountUSD.toFixed(2)})`,
      );
    }

    return swaps;
  }

  /**
   * Plan direct swap action
   */
  private planSwapAction(
    action: ActionBlock,
    portfolioState: PortfolioState,
  ): SwapPlan | null {
    const { swapFrom, swapTo, swapAmount } = action.data;

    if (!swapFrom || !swapTo || !swapAmount) {
      this.logger.warn(`Invalid swap action: missing required fields`);
      return null;
    }

    // Find tokens in portfolio
    const fromToken = portfolioState.tokens.find(
      (t) => t.address.toLowerCase() === swapFrom.address.toLowerCase(),
    );
    const toToken = portfolioState.tokens.find(
      (t) => t.address.toLowerCase() === swapTo.address.toLowerCase(),
    );

    if (!fromToken) {
      this.logger.warn(`Swap from token not found in portfolio: ${swapFrom.symbol}`);
      return null;
    }

    // Convert swap amount to token units
    const fromAmount = BigInt(Math.floor(swapAmount * 10 ** swapFrom.decimals));

    // Check if user has enough balance
    if (fromAmount > fromToken.balance) {
      this.logger.warn(
        `Insufficient balance for swap: ${swapAmount} ${swapFrom.symbol} (have ${Number(fromToken.balance) / 10 ** fromToken.decimals})`,
      );
      return null;
    }

    // Estimate expected output
    const expectedToAmount = toToken
      ? this.usdToTokenAmount(
          (Number(fromAmount) / 10 ** swapFrom.decimals) * fromToken.priceUSD,
          toToken.priceUSD,
          swapTo.decimals,
        )
      : 0n;

    return {
      fromToken: swapFrom.address.toLowerCase(),
      toToken: swapTo.address.toLowerCase(),
      fromAmount,
      expectedToAmount,
      reason: 'swap_action',
    };
  }

  /**
   * Plan transfer action
   */
  private planTransferAction(
    action: ActionBlock,
    portfolioState: PortfolioState,
  ): ExecutionPlan['transfers'][0] | null {
    const { transferAsset, transferTo, transferAmount } = action.data;

    if (!transferAsset || !transferTo || !transferAmount) {
      this.logger.warn(`Invalid transfer action: missing required fields`);
      return null;
    }

    // Find token in portfolio
    const token = portfolioState.tokens.find(
      (t) => t.address.toLowerCase() === transferAsset.address.toLowerCase(),
    );

    if (!token) {
      this.logger.warn(
        `Transfer asset not found in portfolio: ${transferAsset.symbol}`,
      );
      return null;
    }

    // Convert amount to token units
    const amount = BigInt(
      Math.floor(transferAmount * 10 ** transferAsset.decimals),
    );

    // Check balance
    if (amount > token.balance) {
      this.logger.warn(
        `Insufficient balance for transfer: ${transferAmount} ${transferAsset.symbol}`,
      );
      return null;
    }

    return {
      token: transferAsset.address.toLowerCase(),
      to: transferTo.toLowerCase(),
      amount,
    };
  }

  /**
   * Convert USD amount to token amount
   */
  private usdToTokenAmount(
    usdAmount: number,
    priceUSD: number,
    decimals: number,
  ): bigint {
    if (priceUSD === 0) return 0n;
    const tokenAmount = usdAmount / priceUSD;
    return BigInt(Math.floor(tokenAmount * 10 ** decimals));
  }

  /**
   * Get human-readable execution reason
   */
  private getExecutionReason(
    conditionsMet: boolean,
    swaps: SwapPlan[],
    transfers: ExecutionPlan['transfers'],
    hasRebalanceSwaps: boolean,
  ): string {
    // Special case: Rebalance executing even though conditions not met
    if (hasRebalanceSwaps && !conditionsMet) {
      const rebalanceCount = swaps.filter((s) => s.reason === 'rebalance').length;
      return `Executing ${rebalanceCount} rebalance swap(s) (conditions not met, other actions skipped)`;
    }

    if (!conditionsMet) {
      return 'Conditions not met';
    }

    if (swaps.length === 0 && transfers.length === 0) {
      return 'No actions required';
    }

    const parts: string[] = [];
    if (swaps.length > 0) parts.push(`${swaps.length} swap(s)`);
    if (transfers.length > 0) parts.push(`${transfers.length} transfer(s)`);

    return `Executing: ${parts.join(', ')}`;
  }
}

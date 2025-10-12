import { Injectable, Logger } from '@nestjs/common';
import {
  CanvasStrategy,
  ConditionBlock,
  PortfolioState,
} from './types/strategy-logic.types';
import { StrategyParserService } from './strategy-parser.service';

@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  constructor(private readonly parser: StrategyParserService) {}

  /**
   * Evaluate all condition blocks in strategy
   * Returns true if ALL conditions are met (AND logic)
   */
  evaluateConditions(
    strategy: CanvasStrategy,
    portfolioState: PortfolioState,
  ): boolean {
    const conditionBlocks = this.parser.getConditionBlocks(strategy);

    // If no conditions, always return true (no restrictions)
    if (conditionBlocks.length === 0) {
      this.logger.debug('No condition blocks found, returning true');
      return true;
    }

    // Evaluate each condition
    const results = conditionBlocks.map((condition) =>
      this.evaluateCondition(condition, portfolioState),
    );

    // ALL conditions must be true (AND logic)
    const allMet = results.every((result) => result);

    this.logger.debug(
      `Evaluated ${conditionBlocks.length} conditions: ${results.join(', ')} => ${allMet}`,
    );

    return allMet;
  }

  /**
   * Evaluate single condition block
   */
  private evaluateCondition(
    condition: ConditionBlock,
    portfolioState: PortfolioState,
  ): boolean {
    const { conditionType, operator, valueUSD } = condition.data;

    let actualValue: number;

    // Get actual value based on condition type
    switch (conditionType) {
      case 'price':
        actualValue = this.evaluatePriceCondition(condition, portfolioState);
        break;

      case 'portfolioValue':
        actualValue = portfolioState.totalValueUSD;
        break;

      case 'assetValue':
        actualValue = this.evaluateAssetValueCondition(
          condition,
          portfolioState,
        );
        break;

      default:
        this.logger.warn(`Unknown condition type: ${conditionType}`);
        return false;
    }

    // Apply operator
    const result = this.applyOperator(actualValue, operator, valueUSD);

    this.logger.debug(
      `Condition: ${conditionType} ${operator} ${valueUSD} => actual: ${actualValue.toFixed(2)} => ${result}`,
    );

    return result;
  }

  /**
   * Evaluate price condition
   * Checks price of connected asset block
   */
  private evaluatePriceCondition(
    condition: ConditionBlock,
    portfolioState: PortfolioState,
  ): number {
    // Find connected asset block(s)
    const connectedAssetIds = condition.connections.inputs.filter((inputId) => {
      // Assume asset blocks connect to condition inputs
      return inputId.startsWith('asset-');
    });

    if (connectedAssetIds.length === 0) {
      this.logger.warn(`Price condition ${condition.id} has no connected assets`);
      return 0;
    }

    // Use first connected asset
    const assetId = connectedAssetIds[0];

    // Find asset in portfolio by matching block ID pattern
    // Note: In real implementation, we'd need to map block IDs to addresses
    // For now, return first token price as approximation
    const token = portfolioState.tokens[0];
    if (!token) {
      this.logger.warn('No tokens in portfolio for price condition');
      return 0;
    }

    return token.priceUSD;
  }

  /**
   * Evaluate asset value condition
   * Checks USD value of specific asset in portfolio
   */
  private evaluateAssetValueCondition(
    condition: ConditionBlock,
    portfolioState: PortfolioState,
  ): number {
    // Find connected asset block(s)
    const connectedAssetIds = condition.connections.inputs;

    if (connectedAssetIds.length === 0) {
      this.logger.warn(`Asset value condition ${condition.id} has no connected assets`);
      return 0;
    }

    // Use first connected asset
    // Note: In real implementation, map block ID to token address
    const token = portfolioState.tokens[0];
    if (!token) {
      this.logger.warn('No tokens in portfolio for asset value condition');
      return 0;
    }

    return token.valueUSD;
  }

  /**
   * Apply comparison operator
   */
  private applyOperator(
    actualValue: number,
    operator: 'GT' | 'LT',
    targetValue: number,
  ): boolean {
    switch (operator) {
      case 'GT':
        return actualValue > targetValue;
      case 'LT':
        return actualValue < targetValue;
      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Get human-readable explanation of condition evaluation
   */
  getConditionSummary(
    strategy: CanvasStrategy,
    portfolioState: PortfolioState,
  ): string {
    const conditionBlocks = this.parser.getConditionBlocks(strategy);

    if (conditionBlocks.length === 0) {
      return 'No conditions';
    }

    const lines: string[] = [];

    conditionBlocks.forEach((condition, index) => {
      const result = this.evaluateCondition(condition, portfolioState);
      const status = result ? '✓' : '✗';
      const desc = condition.data.description || 'Condition';

      lines.push(`  ${status} ${desc}`);
    });

    return lines.join('\n');
  }
}

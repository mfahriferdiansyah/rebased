import { Injectable, Logger } from '@nestjs/common';
import { StrategyParserService } from './strategy-parser.service';
import { PortfolioAnalyzerService } from './portfolio-analyzer.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ActionPlannerService } from './action-planner.service';
import {
  CanvasStrategy,
  PortfolioState,
  ExecutionPlan,
  ExecutionContext,
} from './types/strategy-logic.types';

export interface StrategyEvaluationResult {
  shouldExecute: boolean;
  reason: string;
  portfolioState: PortfolioState;
  executionPlan: ExecutionPlan;
  conditionsMet: boolean;
  conditionSummary: string;
  portfolioSummary: string;
}

@Injectable()
export class StrategyEngineService {
  private readonly logger = new Logger(StrategyEngineService.name);

  constructor(
    private readonly parser: StrategyParserService,
    private readonly portfolioAnalyzer: PortfolioAnalyzerService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly actionPlanner: ActionPlannerService,
  ) {}

  /**
   * Complete strategy evaluation pipeline
   * Parser → Analyzer → Evaluator → Planner
   */
  async evaluateStrategy(
    strategyLogicJson: any,
    dbStrategy: any,
  ): Promise<StrategyEvaluationResult | null> {
    try {
      // Step 1: Parse strategy logic
      const strategy = this.parser.parseStrategyLogic(strategyLogicJson);
      if (!strategy) {
        this.logger.warn(
          `Failed to parse strategy logic for strategy ${dbStrategy.id}`,
        );
        return null;
      }

      // Validate strategy structure
      const validation = this.parser.validateStrategy(strategy);
      if (!validation.valid) {
        this.logger.error(
          `Strategy ${dbStrategy.id} validation failed: ${validation.errors.join(', ')}`,
        );
        return null;
      }

      this.logger.debug(
        `Evaluating strategy ${dbStrategy.id} for user ${dbStrategy.user.address}`,
      );

      // Step 2: Analyze portfolio state
      // IMPORTANT: Use delegatorAddress (DeleGator smart account) NOT user.address (EOA)
      // All funds are stored in the DeleGator, not the user's EOA!
      const portfolioState = await this.portfolioAnalyzer.analyzePortfolio(
        strategy,
        dbStrategy.delegatorAddress || dbStrategy.user.address, // Fallback to user if no delegator
        dbStrategy.chainId,
      );

      const portfolioSummary =
        this.portfolioAnalyzer.getPortfolioSummary(portfolioState);
      this.logger.debug(`Portfolio state:\n${portfolioSummary}`);

      // Step 3: Evaluate conditions
      const conditionsMet = this.conditionEvaluator.evaluateConditions(
        strategy,
        portfolioState,
      );

      const conditionSummary = this.conditionEvaluator.getConditionSummary(
        strategy,
        portfolioState,
      );
      this.logger.debug(
        `Conditions: ${conditionsMet ? 'MET' : 'NOT MET'}\n${conditionSummary}`,
      );

      // Step 4: Generate execution plan
      const executionPlan = await this.actionPlanner.generateExecutionPlan(
        strategy,
        portfolioState,
        conditionsMet,
      );

      this.logger.debug(
        `Execution plan: ${executionPlan.shouldExecute ? 'EXECUTE' : 'SKIP'} - ${executionPlan.reason}`,
      );

      if (executionPlan.swaps.length > 0) {
        this.logger.debug(`Planned swaps:`);
        executionPlan.swaps.forEach((swap, i) => {
          this.logger.debug(
            `  ${i + 1}. ${swap.fromToken} → ${swap.toToken} (${swap.reason})`,
          );
        });
      }

      return {
        shouldExecute: executionPlan.shouldExecute,
        reason: executionPlan.reason,
        portfolioState,
        executionPlan,
        conditionsMet,
        conditionSummary,
        portfolioSummary,
      };
    } catch (error) {
      this.logger.error(
        `Failed to evaluate strategy ${dbStrategy.id}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Build execution context for executor processor
   */
  async buildExecutionContext(
    strategyLogicJson: any,
    dbStrategy: any,
  ): Promise<ExecutionContext | null> {
    const result = await this.evaluateStrategy(strategyLogicJson, dbStrategy);
    if (!result) return null;

    const strategy = this.parser.parseStrategyLogic(strategyLogicJson);
    if (!strategy) return null;

    return {
      strategy,
      dbStrategy,
      portfolioState: result.portfolioState,
      conditionsMet: result.conditionsMet,
      timestamp: Date.now(),
    };
  }

  /**
   * Quick check if strategy needs rebalancing (for monitoring)
   */
  async needsRebalancing(
    strategyLogicJson: any,
    dbStrategy: any,
  ): Promise<{
    needs: boolean;
    drift: number;
    threshold: number;
    reason: string;
  }> {
    try {
      const strategy = this.parser.parseStrategyLogic(strategyLogicJson);
      if (!strategy) {
        return { needs: false, drift: 0, threshold: 0, reason: 'Invalid strategy' };
      }

      const rebalanceAction = this.parser.getRebalanceAction(strategy);
      if (!rebalanceAction) {
        return { needs: false, drift: 0, threshold: 0, reason: 'No rebalance action' };
      }

      const driftThreshold = rebalanceAction.data.rebalanceTrigger?.drift || 500; // Default 5%

      // IMPORTANT: Use delegatorAddress (DeleGator smart account) NOT user.address (EOA)
      const portfolioState = await this.portfolioAnalyzer.analyzePortfolio(
        strategy,
        dbStrategy.delegatorAddress || dbStrategy.user.address, // Fallback to user if no delegator
        dbStrategy.chainId,
      );

      const needs = this.portfolioAnalyzer.needsRebalancing(
        portfolioState,
        driftThreshold,
      );

      return {
        needs,
        drift: portfolioState.drift,
        threshold: driftThreshold,
        reason: needs
          ? `Drift ${(portfolioState.drift / 100).toFixed(2)}% exceeds threshold ${(driftThreshold / 100).toFixed(2)}%`
          : `Drift ${(portfolioState.drift / 100).toFixed(2)}% within threshold`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check rebalancing need: ${error.message}`,
      );
      return { needs: false, drift: 0, threshold: 0, reason: error.message };
    }
  }

  /**
   * Get strategy summary for logging/debugging
   */
  getStrategySummary(strategyLogicJson: any): string | null {
    try {
      const strategy = this.parser.parseStrategyLogic(strategyLogicJson);
      if (!strategy) return null;

      const assetBlocks = this.parser.getAssetBlocks(strategy);
      const conditionBlocks = this.parser.getConditionBlocks(strategy);
      const actionBlocks = this.parser.getActionBlocks(strategy);

      const lines = [
        `Strategy: ${strategy.name}`,
        `Assets: ${assetBlocks.map((a) => `${a.data.symbol} (${a.data.initialWeight}%)`).join(', ')}`,
        `Conditions: ${conditionBlocks.length}`,
        `Actions: ${actionBlocks.map((a) => a.data.actionType).join(', ')}`,
      ];

      return lines.join('\n');
    } catch (error) {
      this.logger.error(`Failed to get strategy summary: ${error.message}`);
      return null;
    }
  }
}

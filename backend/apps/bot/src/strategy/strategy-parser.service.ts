import { Injectable, Logger } from '@nestjs/common';
import {
  CanvasStrategy,
  Block,
  BlockType,
  AssetBlock,
  ConditionBlock,
  ActionBlock,
} from './types/strategy-logic.types';

@Injectable()
export class StrategyParserService {
  private readonly logger = new Logger(StrategyParserService.name);

  /**
   * Parse strategyLogic JSON from database into typed objects
   */
  parseStrategyLogic(strategyLogic: any): CanvasStrategy | null {
    try {
      // Validate structure
      if (!strategyLogic || typeof strategyLogic !== 'object') {
        this.logger.warn('Invalid strategyLogic: not an object');
        return null;
      }

      const strategy = strategyLogic as CanvasStrategy;

      // Validate required fields
      if (!strategy.id || !strategy.blocks || !Array.isArray(strategy.blocks)) {
        this.logger.warn('Invalid strategyLogic: missing required fields');
        return null;
      }

      // Validate blocks
      const validBlocks = strategy.blocks.filter((block) =>
        this.isValidBlock(block),
      );

      if (validBlocks.length === 0) {
        this.logger.warn('Invalid strategyLogic: no valid blocks');
        return null;
      }

      return {
        ...strategy,
        blocks: validBlocks,
        connections: strategy.connections || [],
        metadata: strategy.metadata || {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: '1.0',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to parse strategyLogic: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate block structure
   */
  private isValidBlock(block: any): block is Block {
    if (!block || typeof block !== 'object') return false;
    if (!block.id || !block.type || !block.data) return false;

    const validTypes = Object.values(BlockType);
    if (!validTypes.includes(block.type)) return false;

    return true;
  }

  /**
   * Extract asset blocks from strategy
   */
  getAssetBlocks(strategy: CanvasStrategy): AssetBlock[] {
    return strategy.blocks.filter(
      (block): block is AssetBlock => block.type === BlockType.ASSET,
    );
  }

  /**
   * Extract condition blocks from strategy
   */
  getConditionBlocks(strategy: CanvasStrategy): ConditionBlock[] {
    return strategy.blocks.filter(
      (block): block is ConditionBlock => block.type === BlockType.CONDITION,
    );
  }

  /**
   * Extract action blocks from strategy
   */
  getActionBlocks(strategy: CanvasStrategy): ActionBlock[] {
    return strategy.blocks.filter(
      (block): block is ActionBlock => block.type === BlockType.ACTION,
    );
  }

  /**
   * Get rebalance action block (if exists)
   */
  getRebalanceAction(strategy: CanvasStrategy): ActionBlock | null {
    const actionBlocks = this.getActionBlocks(strategy);
    return (
      actionBlocks.find(
        (block) => block.data.actionType === 'rebalance',
      ) || null
    );
  }

  /**
   * Get connected blocks for a given block
   */
  getConnectedBlocks(
    strategy: CanvasStrategy,
    blockId: string,
    direction: 'inputs' | 'outputs',
  ): Block[] {
    const block = strategy.blocks.find((b) => b.id === blockId);
    if (!block) return [];

    const connectedIds = block.connections[direction];
    return strategy.blocks.filter((b) => connectedIds.includes(b.id));
  }

  /**
   * Build execution graph from connections
   * Returns blocks in topological order
   */
  buildExecutionOrder(strategy: CanvasStrategy): Block[] {
    const visited = new Set<string>();
    const result: Block[] = [];

    const visit = (blockId: string) => {
      if (visited.has(blockId)) return;
      visited.add(blockId);

      const block = strategy.blocks.find((b) => b.id === blockId);
      if (!block) return;

      // Visit inputs first (dependencies)
      block.connections.inputs.forEach((inputId) => visit(inputId));

      result.push(block);
    };

    // Start from blocks with no inputs (root nodes)
    strategy.blocks
      .filter((block) => block.connections.inputs.length === 0)
      .forEach((block) => visit(block.id));

    return result;
  }

  /**
   * Validate strategy has minimum required blocks
   */
  validateStrategy(strategy: CanvasStrategy): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Must have at least 1 asset block
    const assetBlocks = this.getAssetBlocks(strategy);
    if (assetBlocks.length === 0) {
      errors.push('Strategy must have at least one asset block');
    }

    // Validate asset weights sum to 100%
    const totalWeight = assetBlocks.reduce(
      (sum, block) => sum + block.data.initialWeight,
      0,
    );
    if (Math.abs(totalWeight - 100) > 0.1) {
      errors.push(
        `Asset weights must sum to 100% (got ${totalWeight.toFixed(1)}%)`,
      );
    }

    // Must have at least 1 action block
    const actionBlocks = this.getActionBlocks(strategy);
    if (actionBlocks.length === 0) {
      errors.push('Strategy must have at least one action block');
    }

    // Validate rebalance action has valid interval
    const rebalanceAction = this.getRebalanceAction(strategy);
    if (rebalanceAction) {
      const interval = rebalanceAction.data.rebalanceTrigger?.interval;
      if (!interval || interval < 1) {
        errors.push('Rebalance interval must be at least 1 minute');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get target weights map (address -> weight percentage)
   */
  getTargetWeights(strategy: CanvasStrategy): Map<string, number> {
    const weights = new Map<string, number>();
    const assetBlocks = this.getAssetBlocks(strategy);

    assetBlocks.forEach((block) => {
      weights.set(
        block.data.address.toLowerCase(),
        block.data.initialWeight,
      );
    });

    return weights;
  }
}

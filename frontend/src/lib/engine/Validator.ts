import { Strategy } from "@/lib/types/strategy";
import { Block, BlockType } from "@/lib/types/blocks";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class StrategyValidator {
  validate(strategy: Strategy): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for at least one asset
    const assetBlocks = strategy.blocks.filter(
      (b) => b.type === BlockType.ASSET
    );
    if (assetBlocks.length === 0) {
      errors.push("Strategy must have at least one asset block");
    }

    // Check total weight = 100%
    if (assetBlocks.length > 0) {
      const totalWeight = assetBlocks.reduce(
        (sum, block) => sum + (block.data.initialWeight || 0),
        0
      );
      if (Math.abs(totalWeight - 100) > 0.01) {
        errors.push(
          `Total asset weights must equal 100% (current: ${totalWeight.toFixed(1)}%)`
        );
      }
    }

    // Check for orphan blocks (no connections)
    strategy.blocks.forEach((block) => {
      if (block.type !== BlockType.ASSET) {
        const hasIncoming = strategy.connections.some(
          (conn) => conn.target.blockId === block.id
        );
        const hasOutgoing = strategy.connections.some(
          (conn) => conn.source.blockId === block.id
        );

        if (!hasIncoming && !hasOutgoing) {
          warnings.push(
            `Block "${block.id}" is not connected to any other blocks`
          );
        }
      }
    });

    // Check for circular dependencies
    if (this.hasCircularDependency(strategy)) {
      errors.push("Strategy contains circular dependencies");
    }

    // Check for duplicate asset symbols
    const symbols = assetBlocks.map((b) => b.data.symbol);
    const duplicates = symbols.filter(
      (item, index) => symbols.indexOf(item) !== index
    );
    if (duplicates.length > 0) {
      warnings.push(
        `Duplicate asset symbols found: ${[...new Set(duplicates)].join(", ")}`
      );
    }

    // Check for action blocks without targets
    const actionBlocks = strategy.blocks.filter(
      (b) => b.type === BlockType.ACTION
    );
    actionBlocks.forEach((block) => {
      if (!block.data.targets || block.data.targets.length === 0) {
        errors.push(`Action block "${block.id}" has no target allocations`);
      }
    });

    // Check for condition blocks without proper configuration
    const conditionBlocks = strategy.blocks.filter(
      (b) => b.type === BlockType.CONDITION
    );
    conditionBlocks.forEach((block) => {
      if (!block.data.operator || !block.data.leftOperand || !block.data.rightOperand) {
        errors.push(`Condition block "${block.id}" is not properly configured`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private hasCircularDependency(strategy: Strategy): boolean {
    // Build adjacency list
    const graph = new Map<string, string[]>();
    strategy.blocks.forEach((block) => {
      graph.set(block.id, []);
    });

    strategy.connections.forEach((conn) => {
      const neighbors = graph.get(conn.source.blockId) || [];
      neighbors.push(conn.target.blockId);
      graph.set(conn.source.blockId, neighbors);
    });

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const blockId of graph.keys()) {
      if (!visited.has(blockId)) {
        if (hasCycle(blockId)) return true;
      }
    }

    return false;
  }
}

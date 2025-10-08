// Block Type System

export enum BlockType {
  ASSET = "asset",
  CONDITION = "condition",
  ACTION = "action",
  TRIGGER = "trigger",
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: Record<string, any>;
  connections: {
    inputs: string[]; // IDs of blocks connected to inputs
    outputs: string[]; // IDs of blocks connected to outputs
  };
}

export interface AssetBlock extends BaseBlock {
  type: BlockType.ASSET;
  data: {
    symbol: string; // e.g., "ETH"
    name: string; // e.g., "Ethereum"
    initialWeight: number; // e.g., 60 (%)
    address?: string; // Token contract address
    icon?: string; // Icon URL or emoji
  };
}

export interface ConditionBlock extends BaseBlock {
  type: BlockType.CONDITION;
  data: {
    operator: "GT" | "LT" | "EQ" | "GTE" | "LTE";
    leftOperand: {
      type: "price" | "allocation" | "portfolioValue" | "time";
      asset?: string; // Asset symbol if applicable
    };
    rightOperand: {
      type: "value" | "percentage";
      value: number;
    };
    description?: string; // Human-readable description
  };
}

export interface ActionBlock extends BaseBlock {
  type: BlockType.ACTION;
  data: {
    actionType: "rebalance" | "swap" | "shift";
    targets: Array<{
      asset: string;
      targetWeight: number;
    }>;
    description?: string;
  };
}

export interface TriggerBlock extends BaseBlock {
  type: BlockType.TRIGGER;
  data: {
    triggerType: "interval" | "drift" | "condition";
    config: {
      interval?: number; // seconds
      driftThreshold?: number; // percentage
      conditions?: string[]; // IDs of condition blocks
    };
  };
}

export type Block = AssetBlock | ConditionBlock | ActionBlock | TriggerBlock;

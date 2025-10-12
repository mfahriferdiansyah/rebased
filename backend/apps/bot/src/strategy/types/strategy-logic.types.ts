/**
 * Strategy Logic Types
 * Mirrors frontend block types for bot execution
 */

export enum BlockType {
  ASSET = 'asset',
  CONDITION = 'condition',
  ACTION = 'action',
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: Record<string, any>;
  connections: {
    inputs: string[];
    outputs: string[];
  };
}

// ============================================
// ASSET BLOCK
// ============================================

export interface AssetBlockData {
  symbol: string;
  name: string;
  initialWeight: number; // Percentage (0-100)
  address: string;
  chainId: number;
  decimals: number;
  logoUri?: string;
}

export interface AssetBlock extends BaseBlock {
  type: BlockType.ASSET;
  data: AssetBlockData;
}

// ============================================
// CONDITION BLOCK
// ============================================

export type ConditionType = 'price' | 'portfolioValue' | 'assetValue';
export type ConditionOperator = 'GT' | 'LT';

export interface ConditionBlockData {
  conditionType: ConditionType;
  operator: ConditionOperator;
  valueUSD: number;
  description?: string;
}

export interface ConditionBlock extends BaseBlock {
  type: BlockType.CONDITION;
  data: ConditionBlockData;
}

// ============================================
// ACTION BLOCK
// ============================================

export type ActionType = 'rebalance' | 'swap' | 'transfer';

export interface RebalanceTrigger {
  interval: number; // Minutes
  drift?: number; // Percentage (optional)
}

export interface Token {
  symbol: string;
  name: string;
  address: string;
  chainId: number;
  decimals: number;
  logoUri?: string;
}

export interface ActionBlockData {
  actionType: ActionType;

  // Rebalance
  rebalanceTrigger?: RebalanceTrigger;

  // Swap
  swapFrom?: Token;
  swapTo?: Token;
  swapAmount?: number;

  // Transfer
  transferAsset?: Token;
  transferTo?: string;
  transferAmount?: number;

  description?: string;
}

export interface ActionBlock extends BaseBlock {
  type: BlockType.ACTION;
  data: ActionBlockData;
}

// ============================================
// UNIFIED TYPES
// ============================================

export type Block = AssetBlock | ConditionBlock | ActionBlock;

export interface Connection {
  id: string;
  source: {
    blockId: string;
    port: string;
  };
  target: {
    blockId: string;
    port: string;
  };
}

export interface StrategyMetadata {
  createdAt: number;
  updatedAt: number;
  version: string;
}

export interface CanvasStrategy {
  id: string;
  name: string;
  description: string;
  blocks: Block[];
  connections: Connection[];
  metadata: StrategyMetadata;
  startBlockPosition?: { x: number; y: number };
  endBlockPosition?: { x: number; y: number };
}

// ============================================
// EXECUTION CONTEXT
// ============================================

export interface PortfolioState {
  tokens: {
    address: string;
    symbol: string;
    balance: bigint;
    decimals: number;
    priceUSD: number;
    valueUSD: number;
    currentWeight: number; // Percentage
    targetWeight: number; // Percentage
  }[];
  totalValueUSD: number;
  drift: number; // Basis points
}

export interface ExecutionContext {
  strategy: CanvasStrategy;
  dbStrategy: any; // Prisma strategy record
  portfolioState: PortfolioState;
  conditionsMet: boolean;
  timestamp: number;
}

export interface SwapPlan {
  fromToken: string; // Address
  toToken: string; // Address
  fromAmount: bigint;
  expectedToAmount: bigint;
  reason: 'rebalance' | 'swap_action';
}

export interface ExecutionPlan {
  swaps: SwapPlan[];
  transfers: {
    token: string;
    to: string;
    amount: bigint;
  }[];
  estimatedGas: bigint;
  shouldExecute: boolean;
  reason: string;
}

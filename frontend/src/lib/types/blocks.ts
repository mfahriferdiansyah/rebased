// Block Type System

export enum BlockType {
  ASSET = "asset",
  CONDITION = "condition",
  ACTION = "action",
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
    address: string; // Token contract address
    chainId: number; // Chain ID (e.g., 10143 for Monad, 84532 for Base)
    decimals: number; // Token decimals (e.g., 18, 6)
    logoUri?: string; // Token logo URL
  };
}

export interface ConditionBlock extends BaseBlock {
  type: BlockType.CONDITION;
  data: {
    conditionType: "price" | "portfolioValue" | "assetValue";
    operator: "GT" | "LT"; // More than (>) or Less than (<) only
    valueUSD: number; // Value in USD
    description?: string; // Auto-generated description
  };
}

export interface ActionBlock extends BaseBlock {
  type: BlockType.ACTION;
  data: {
    actionType: "rebalance" | "swap" | "transfer";

    // REBALANCE: Time-based trigger (required) with optional drift threshold
    rebalanceTrigger?: {
      interval: number; // Required: time interval in minutes (minimum 1)
      drift?: number;   // Optional: drift threshold in percentage
    };

    // SWAP: From token to token with amount
    swapFrom?: {
      symbol: string;
      name: string;
      address: string;
      chainId: number;
      decimals: number;
      logoUri?: string;
    };
    swapTo?: {
      symbol: string;
      name: string;
      address: string;
      chainId: number;
      decimals: number;
      logoUri?: string;
    };
    swapAmount?: number; // Amount in USD or token units

    // TRANSFER: Asset to address with amount
    transferAsset?: {
      symbol: string;
      name: string;
      address: string;
      chainId: number;
      decimals: number;
      logoUri?: string;
    };
    transferTo?: string; // Destination address
    transferAmount?: number; // Amount in USD or token units

    description?: string; // Human-readable description
  };
}

export type Block = AssetBlock | ConditionBlock | ActionBlock;

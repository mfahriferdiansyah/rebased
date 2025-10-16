/**
 * API Strategy Types
 * Matches backend StrategyDto for on-chain strategies
 */

export interface CreateStrategyDto {
  strategyId?: string; // On-chain strategy ID (from StrategyRegistry contract)
  deployTxHash?: string; // Deployment transaction hash
  chainId: number;
  tokens: string[]; // Token addresses
  weights: number[]; // Basis points (e.g., 5000 = 50%)
  rebalanceInterval: number; // Seconds
  delegatorAddress?: string; // DeleGator smart contract address
  strategyLogic?: object; // Complete canvas strategy (blocks, connections, metadata)
  name?: string; // Strategy name
}

export interface ApiStrategy {
  id: string;
  chainId: number;
  strategyId: bigint;
  userAddress: string;
  delegatorAddress?: string;
  tokens: string[];
  weights: number[];
  rebalanceInterval: bigint;
  strategyLogic?: object; // Complete canvas strategy if provided
  version: string;
  isActive: boolean;
  isDeployed: boolean;
  deployTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

// Backend currently returns array directly, not wrapped object
// Handle both formats for backward compatibility
export type StrategyListResponse =
  | ApiStrategy[] // Current backend format
  | { strategies: ApiStrategy[]; count: number }; // Future format

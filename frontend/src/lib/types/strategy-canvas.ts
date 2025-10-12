/**
 * Strategy Types
 * Matches backend StrategyDto
 */

export interface CreateStrategyDto {
  chainId: number;
  tokens: string[]; // Token addresses
  weights: number[]; // Basis points (e.g., 5000 = 50%)
  rebalanceInterval: number; // Seconds
}

export interface Strategy {
  id: string;
  chainId: number;
  strategyId: bigint;
  userAddress: string;
  tokens: string[];
  weights: number[];
  rebalanceInterval: bigint;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyListResponse {
  strategies: Strategy[];
  count: number;
}

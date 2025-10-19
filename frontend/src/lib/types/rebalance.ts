/**
 * Rebalance Types
 */

export enum RebalanceStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REVERTED = 'REVERTED',
}

export interface Rebalance {
  id: string;
  strategyId: string;
  txHash: string;
  chainId: number;
  userAddress: string;
  drift: string;
  driftAfter: string | null;
  gasUsed: string;
  gasPrice: string;
  gasCost: string;
  swapsExecuted: number;
  status: RebalanceStatus;
  errorMessage?: string | null;
  executedBy?: string | null;
  createdAt: string;
  executedAt: string;
  strategyName?: string;
}

export interface RebalanceListResponse {
  data: Rebalance[];
  total: number;
}

export interface RebalanceStatsResponse {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  totalGasCost: string;
  avgDriftReduction: number;
}

export interface GetRebalancesQuery {
  strategyId?: string;
  chainId?: number;
  status?: RebalanceStatus;
  limit?: number;
  skip?: number;
}

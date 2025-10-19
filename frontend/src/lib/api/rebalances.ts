/**
 * Rebalances API Client
 */

import { apiClient } from './client';
import {
  Rebalance,
  RebalanceListResponse,
  RebalanceStatsResponse,
  GetRebalancesQuery,
} from '../types/rebalance';

export class RebalancesApi {
  /**
   * Get all rebalances for current user
   */
  async getRebalances(
    token: string,
    query?: GetRebalancesQuery,
  ): Promise<RebalanceListResponse> {
    const params = new URLSearchParams();

    if (query?.strategyId) params.append('strategyId', query.strategyId);
    if (query?.chainId) params.append('chainId', query.chainId.toString());
    if (query?.status) params.append('status', query.status);
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.skip) params.append('skip', query.skip.toString());

    const queryString = params.toString();
    const url = `/rebalances${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<RebalanceListResponse>(url, token);
  }

  /**
   * Get rebalance statistics
   */
  async getStats(token: string, chainId?: number): Promise<RebalanceStatsResponse> {
    const query = chainId ? `?chainId=${chainId}` : '';
    return apiClient.get<RebalanceStatsResponse>(`/rebalances/stats${query}`, token);
  }

  /**
   * Get a specific rebalance
   */
  async getRebalance(id: string, token: string): Promise<Rebalance> {
    return apiClient.get<Rebalance>(`/rebalances/${id}`, token);
  }
}

// Export singleton instance
export const rebalancesApi = new RebalancesApi();

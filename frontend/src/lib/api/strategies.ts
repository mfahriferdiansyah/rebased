/**
 * Strategies API Client
 */

import { apiClient } from './client';
import {
  CreateStrategyDto,
  ApiStrategy,
  StrategyListResponse,
} from '../types/api-strategy';

export class StrategiesApi {
  /**
   * Create a new strategy
   */
  async createStrategy(
    data: CreateStrategyDto,
    token: string,
  ): Promise<ApiStrategy> {
    return apiClient.post<ApiStrategy, CreateStrategyDto>(
      '/strategies',
      data,
      token,
    );
  }

  /**
   * Get all strategies for current user
   */
  async getStrategies(token: string, chainId?: number): Promise<StrategyListResponse> {
    const query = chainId ? `?chainId=${chainId}` : '';
    return apiClient.get<StrategyListResponse>(`/strategies${query}`, token);
  }

  /**
   * Get a specific strategy
   */
  async getStrategy(id: string, token: string): Promise<ApiStrategy> {
    return apiClient.get<ApiStrategy>(`/strategies/${id}`, token);
  }

  /**
   * Update a strategy
   */
  async updateStrategy(
    id: string,
    data: Partial<CreateStrategyDto>,
    token: string,
  ): Promise<ApiStrategy> {
    return apiClient.patch<ApiStrategy, Partial<CreateStrategyDto>>(
      `/strategies/${id}`,
      data,
      token,
    );
  }

  /**
   * Deactivate a strategy
   */
  async deleteStrategy(id: string, token: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/strategies/${id}`, token);
  }
}

// Export singleton instance
export const strategiesApi = new StrategiesApi();

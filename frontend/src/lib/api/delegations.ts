import { apiClient } from './client';
import type {
  Delegation,
  CreateDelegationDto,
  DelegationStats,
} from '../types/delegation';

/**
 * Delegations API Client
 * Communicates with backend /delegations endpoints
 * Matches backend DelegationsController
 */
export class DelegationsApi {
  /**
   * Create a new delegation
   * Submits EIP-712 signed delegation to backend
   *
   * POST /delegations
   */
  async createDelegation(
    data: CreateDelegationDto,
    token: string
  ): Promise<Delegation> {
    return apiClient.post<Delegation, CreateDelegationDto>(
      '/delegations',
      data,
      token
    );
  }

  /**
   * Get all delegations for current user
   *
   * GET /delegations?userAddress=0x...&chainId=10143&isActive=true
   */
  async getDelegations(
    token: string,
    chainId?: number,
    isActive?: boolean,
    userAddress?: string
  ): Promise<Delegation[]> {
    const params = new URLSearchParams();
    if (userAddress) params.append('userAddress', userAddress); // Temporarily send userAddress
    if (chainId !== undefined) params.append('chainId', chainId.toString());
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<Delegation[]>(`/delegations${query}`); // No token needed (auth disabled)
  }

  /**
   * Get a specific delegation by ID
   *
   * GET /delegations/:id?userAddress=0x...
   */
  async getDelegation(id: string, token: string, userAddress?: string): Promise<Delegation> {
    const params = new URLSearchParams();
    if (userAddress) params.append('userAddress', userAddress);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<Delegation>(`/delegations/${id}${query}`);
  }

  /**
   * Revoke a delegation (marks as inactive)
   *
   * POST /delegations/:id/revoke
   */
  async revokeDelegation(
    id: string,
    token: string,
    userAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }, { userAddress?: string }>(
      `/delegations/${id}/revoke`,
      { userAddress },
    );
  }

  /**
   * Get delegation statistics for user
   *
   * GET /delegations/stats?userAddress=0x...
   */
  async getDelegationStats(token: string, userAddress?: string): Promise<DelegationStats> {
    const params = new URLSearchParams();
    if (userAddress) params.append('userAddress', userAddress);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<DelegationStats>(`/delegations/stats${query}`);
  }

  /**
   * Link delegation to a strategy
   *
   * PATCH /delegations/:id/link-strategy
   */
  async linkDelegationToStrategy(
    delegationId: string,
    strategyId: string,
    token: string,
    userAddress?: string
  ): Promise<Delegation> {
    const params = new URLSearchParams();
    if (userAddress) params.append('userAddress', userAddress);
    const query = params.toString() ? `?${params.toString()}` : '';

    return apiClient.patch<Delegation, { strategyId: string }>(
      `/delegations/${delegationId}/link-strategy${query}`,
      { strategyId },
      token
    );
  }
}

// Export singleton instance
export const delegationsApi = new DelegationsApi();

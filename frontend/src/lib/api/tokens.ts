/**
 * Tokens API Client
 * Falls back to mock data when backend is unavailable
 */

import { apiClient } from './client';
import { Token, TokenListResponse } from '../types/token';
import { mockTokensApi } from '../mock/tokens';

export class TokensApi {
  private useMockData = false;

  /**
   * Get all tokens, optionally filtered by chain(s)
   */
  async getTokens(chainIds?: number | number[], search?: string): Promise<TokenListResponse> {
    // If mock data is enabled, use it directly
    if (this.useMockData) {
      return Promise.resolve(mockTokensApi.getTokens(chainIds, search));
    }

    try {
      const params = new URLSearchParams();

      // Handle both single chain ID and array of chain IDs
      if (chainIds) {
        const chainIdString = Array.isArray(chainIds)
          ? chainIds.join(',')
          : chainIds.toString();
        params.append('chainId', chainIdString);
      }

      if (search) params.append('search', search);

      const query = params.toString() ? `?${params.toString()}` : '';
      return await apiClient.get<TokenListResponse>(`/tokens${query}`);
    } catch (error) {
      console.warn('Backend unavailable, using mock token data:', error);
      // Fallback to mock data on error
      this.useMockData = true;
      return mockTokensApi.getTokens(chainIds, search);
    }
  }

  /**
   * Get a specific token by address and chain
   */
  async getToken(chainId: number, address: string): Promise<Token> {
    // If mock data is enabled, use it directly
    if (this.useMockData) {
      const token = mockTokensApi.getToken(chainId, address);
      if (!token) {
        throw new Error(`Token not found: ${address} on chain ${chainId}`);
      }
      return Promise.resolve(token);
    }

    try {
      return await apiClient.get<Token>(`/tokens/${chainId}/${address}`);
    } catch (error) {
      console.warn('Backend unavailable, using mock token data:', error);
      // Fallback to mock data on error
      this.useMockData = true;
      const token = mockTokensApi.getToken(chainId, address);
      if (!token) {
        throw new Error(`Token not found: ${address} on chain ${chainId}`);
      }
      return token;
    }
  }

  /**
   * Search tokens by symbol or name
   */
  async searchTokens(query: string, chainIds?: number | number[]): Promise<TokenListResponse> {
    return this.getTokens(chainIds, query);
  }
}

// Export singleton instance
export const tokensApi = new TokensApi();

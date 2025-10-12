/**
 * Authentication API Client (SIWE Flow)
 *
 * Handles Sign-In With Ethereum (EIP-4361) authentication
 * to get backend-issued JWT tokens for API access
 */

import { apiClient } from './client';

export interface GetNonceRequest {
  address: string;
}

export interface GetNonceResponse {
  nonce: string;
}

export interface VerifySignatureRequest {
  message: string;
  signature: string;
}

export interface AuthResponse {
  accessToken: string;
  address: string;
  expiresAt: number;
}

export class AuthApi {
  /**
   * Get a nonce for SIWE authentication
   * @param address Ethereum address
   * @returns Nonce string
   */
  async getNonce(address: string): Promise<GetNonceResponse> {
    return apiClient.post<GetNonceResponse, GetNonceRequest>(
      '/auth/nonce',
      { address }
    );
  }

  /**
   * Verify SIWE signature and get backend JWT
   * @param message SIWE message
   * @param signature User's signature
   * @returns JWT access token and user info
   */
  async verifySignature(
    message: string,
    signature: string
  ): Promise<AuthResponse> {
    return apiClient.post<AuthResponse, VerifySignatureRequest>(
      '/auth/verify',
      { message, signature }
    );
  }
}

// Export singleton instance
export const authApi = new AuthApi();

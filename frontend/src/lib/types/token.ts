/**
 * Token Types
 * Matches backend TokenDto
 */

export enum ChainId {
  MONAD_TESTNET = 10143,
  BASE_SEPOLIA = 84532,
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoUri?: string;
  description?: string;
  website?: string;
}

export interface TokenListResponse {
  tokens: Token[];
  count: number;
}

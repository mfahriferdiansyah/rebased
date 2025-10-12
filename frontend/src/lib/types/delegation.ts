/**
 * ERC-7710 Delegation Types
 * Matches backend DelegationDto and Solidity DelegationTypes.sol
 */

// Caveat enforcer for delegation restrictions
export interface Caveat {
  enforcer: `0x${string}`;  // Caveat enforcer contract address
  terms: `0x${string}`;      // Encoded terms (e.g., allowed methods, time limits)
  args?: `0x${string}`;      // Runtime arguments (optional)
}

// Core delegation structure (ERC-7710)
export interface DelegationData {
  delegate: `0x${string}`;   // Bot executor address
  authority: `0x${string}`;  // Parent delegation hash (0x0 for root)
  caveats: Caveat[];         // Restrictions array
  salt: bigint;              // Unique salt to prevent collision
}

// Full delegation with signature
export interface Delegation {
  id: string;
  chainId: number;
  strategyId?: string; // Optional - can be linked later
  userAddress: string;
  delegateAddress: string;
  delegationData: DelegationData;
  signature: `0x${string}`;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  strategy?: {
    id: string;
    strategyId: string;
    tokens: string[];
    weights: number[];
    isActive: boolean;
  };
}

// Create delegation DTO
export interface CreateDelegationDto {
  chainId: number;
  strategyId?: string; // Optional - can be linked to strategy later
  delegateAddress: `0x${string}`;
  delegationData: DelegationData;
  signature: `0x${string}`;
}

// Delegation stats
export interface DelegationStats {
  totalDelegations: number;
  activeDelegations: number;
  revokedDelegations: number;
  chainBreakdown: Record<number, number>;
}

// EIP-712 Domain for delegation signing
export interface DelegationDomain {
  name: string;
  version: string;
  chainId: bigint;
  verifyingContract: `0x${string}`;
}

// EIP-712 Types (matches backend DelegationsService.getDelegationTypes())
export const DELEGATION_TYPES = {
  Delegation: [
    { name: 'delegate', type: 'address' },
    { name: 'authority', type: 'bytes32' },
    { name: 'caveats', type: 'Caveat[]' },
    { name: 'salt', type: 'uint256' },
  ],
  Caveat: [
    { name: 'enforcer', type: 'address' },
    { name: 'terms', type: 'bytes' },
  ],
} as const;

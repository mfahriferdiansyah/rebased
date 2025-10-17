import { type WalletClient } from 'viem';
import {
  type DelegationData,
  type DelegationDomain,
  DELEGATION_TYPES,
  type Caveat,
} from '../types/delegation';

/**
 * Generate EIP-712 domain separator for delegation signing
 * Matches backend DelegationsService.getDomain()
 */
export function getDelegationDomain(
  chainId: number,
  delegationManagerAddress: `0x${string}`
): DelegationDomain {
  return {
    name: 'DelegationManager',
    version: '1', // MUST match DelegationManager.sol DOMAIN_VERSION (not VERSION)
    chainId: BigInt(chainId),
    verifyingContract: delegationManagerAddress,
  };
}

/**
 * Get delegation manager contract address for chain
 * Should match backend config blockchain.[chain].contracts.delegationManager
 */
export function getDelegationManagerAddress(chainId: number): `0x${string}` {
  // These should come from env and match backend config
  const addresses: Record<number, `0x${string}`> = {
    10143: (import.meta.env.VITE_MONAD_DELEGATION_MANAGER || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    84532: (import.meta.env.VITE_BASE_DELEGATION_MANAGER || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  };

  const address = addresses[chainId];
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`No delegation manager configured for chain ${chainId}`);
  }

  return address;
}

/**
 * Generate random salt for delegation uniqueness
 * Prevents delegation collision and replay attacks
 */
export function generateDelegationSalt(): bigint {
  // Generate 256-bit random number
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
}

/**
 * Sign delegation with EIP-712 (eth_signTypedData_v4)
 *
 * @param walletClient - Viem wallet client from wagmi
 * @param account - User's wallet address
 * @param delegationData - Delegation to sign (without signature)
 * @param chainId - Chain ID for domain separator
 * @returns EIP-712 signature
 */
export async function signDelegation(
  walletClient: WalletClient,
  account: `0x${string}`,
  delegationData: DelegationData,
  chainId: number
): Promise<`0x${string}`> {
  const delegationManagerAddress = getDelegationManagerAddress(chainId);
  const domain = getDelegationDomain(chainId, delegationManagerAddress);

  try {
    // Sign with EIP-712 (eth_signTypedData_v4)
    // This matches the backend verification in DelegationsService.create()
    // NOTE: MetaMask v1.3.0 does NOT include 'deadline' in EIP-712 message
    const signature = await walletClient.signTypedData({
      account,
      domain,
      types: DELEGATION_TYPES,
      primaryType: 'Delegation',
      message: {
        delegate: delegationData.delegate,
        delegator: delegationData.delegator,
        authority: delegationData.authority,
        caveats: delegationData.caveats.map(c => ({
          enforcer: c.enforcer,
          terms: c.terms,
        })),
        salt: delegationData.salt,
        // deadline is NOT included in MetaMask v1.3.0 EIP-712 signature
      },
    });

    return signature;
  } catch (error: any) {
    console.error('Delegation signing error:', error);

    // User rejected signature
    if (error.code === 4001 || error.message?.includes('User rejected')) {
      throw new Error('Signature rejected by user');
    }

    throw new Error(`Failed to sign delegation: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create empty caveats array (no restrictions)
 * For MVP, delegations have no caveats - full trust to bot
 */
export function createEmptyCaveats(): Caveat[] {
  return [];
}

/**
 * Create root authority (no parent delegation)
 * For MVP, all delegations are root delegations
 * MUST match DelegationManager.sol ROOT_AUTHORITY constant
 */
export function createRootAuthority(): `0x${string}` {
  return '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
}

/**
 * Create time-based caveat (future enhancement)
 * Restricts delegation to expire after certain time
 *
 * @param expirationTimestamp - Unix timestamp when delegation expires
 * @param enforcerAddress - Address of TimeEnforcer contract
 */
export function createTimeCaveat(
  expirationTimestamp: number,
  enforcerAddress: `0x${string}`
): Caveat {
  // Encode expiration timestamp as terms (32 bytes)
  const terms = `0x${expirationTimestamp.toString(16).padStart(64, '0')}` as `0x${string}`;

  return {
    enforcer: enforcerAddress,
    terms,
    args: '0x' as `0x${string}`,
  };
}

/**
 * Create method whitelist caveat (future enhancement)
 * Restricts delegation to specific function selectors
 *
 * @param allowedMethods - Array of function selectors (e.g., ['0x12345678'])
 * @param enforcerAddress - Address of MethodEnforcer contract
 */
export function createMethodWhitelistCaveat(
  allowedMethods: string[], // Array of 4-byte selectors
  enforcerAddress: `0x${string}`
): Caveat {
  // Encode method selectors as concatenated bytes
  const terms = `0x${allowedMethods.map(m => m.replace('0x', '')).join('')}` as `0x${string}`;

  return {
    enforcer: enforcerAddress,
    terms,
    args: '0x' as `0x${string}`,
  };
}

/**
 * Create value limit caveat (future enhancement)
 * Restricts delegation to transactions below certain value
 *
 * @param maxValue - Maximum ETH value per transaction (in wei)
 * @param enforcerAddress - Address of ValueEnforcer contract
 */
export function createValueLimitCaveat(
  maxValue: bigint,
  enforcerAddress: `0x${string}`
): Caveat {
  // Encode max value as terms (32 bytes)
  const terms = `0x${maxValue.toString(16).padStart(64, '0')}` as `0x${string}`;

  return {
    enforcer: enforcerAddress,
    terms,
    args: '0x' as `0x${string}`,
  };
}

/**
 * Get delegate address for creating "open delegations"
 * Returns MetaMask's ANY_DELEGATE constant (createOpenDelegation pattern)
 *
 * This allows RebalanceExecutor contract to call DelegationManager.redeemDelegations()
 * on behalf of the bot, while keeping all validation logic on-chain in RebalanceExecutor.
 *
 * @see https://docs.metamask.io/delegation-toolkit/reference/delegation/#createopendelegation
 * @see DelegationManager.sol:40-41 - ANY_DELEGATE = address(0xa11)
 */
export function getBotExecutorAddress(chainId: number): `0x${string}` {
  // MetaMask's ANY_DELEGATE constant - allows any caller to redeem delegation
  // This is the standard pattern for "open delegations" in MetaMask Delegation Framework
  return '0x0000000000000000000000000000000000000a11';
}

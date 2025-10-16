import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom } from 'viem';
import { getChainById } from '@/lib/chains';
import { delegationsApi } from '@/lib/api/delegations';
import {
  signDelegation,
  generateDelegationSalt,
  createEmptyCaveats,
  createRootAuthority,
  getBotExecutorAddress,
} from '@/lib/utils/delegation-signatures';
import type {
  Delegation,
  DelegationData,
  CreateDelegationDto,
  DelegationStats,
} from '@/lib/types/delegation';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

/**
 * Delegation Hook - Production Quality
 *
 * Features:
 * - Hybrid Privy + SIWE authentication
 * - Retry logic (3 attempts) for transient failures
 * - Graceful error handling
 * - Auto cleanup on logout
 * - No console spam when not authenticated
 */
export function useDelegation(chainId?: number) {
  const { isPrivyAuthenticated, getBackendToken, isBackendAuthenticated } = useAuth();
  const { wallets } = useWallets();
  const { toast } = useToast();

  // State
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [activeDelegation, setActiveDelegation] = useState<Delegation | null>(null);
  const [stats, setStats] = useState<DelegationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Track if we've already fetched to avoid duplicate requests
  const fetchedRef = useRef(false);

  const wallet = wallets[0];
  const userAddress = wallet?.address as `0x${string}` | undefined;

  // Only fetch when fully authenticated (both Privy and backend)
  const canFetchData = isPrivyAuthenticated && isBackendAuthenticated && userAddress;


  /**
   * Fetch delegations with retry logic
   */
  const fetchDelegations = useCallback(async () => {
    // Don't fetch if not ready
    if (!canFetchData) {
      setDelegations([]);
      setActiveDelegation(null);
      return;
    }

    setLoading(true);

    // Retry logic for transient failures
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const token = await getBackendToken();
        if (!token) {
          throw new Error('Unable to retrieve backend JWT');
        }

        const data = await delegationsApi.getDelegations(
          token,
          chainId,
          true, // Only active delegations
          userAddress // Pass userAddress
        );

        console.log(`[useDelegation] Fetched ${data.length} delegations:`, data);

        setDelegations(data);

        // Always set activeDelegation to the first delegation (most recent)
        if (data.length > 0) {
          setActiveDelegation(data[0]);
          console.log('[useDelegation] Set activeDelegation:', data[0].id);
        } else {
          setActiveDelegation(null);
          console.log('[useDelegation] No delegations found');
        }

        // Success - break retry loop
        break;

      } catch (error: any) {
        attempts++;

        // Handle token expiry - retry with fresh token
        if (error.message?.includes('Invalid or expired token') || error.message?.includes('401')) {
          if (attempts < maxAttempts) {
            console.warn(`Token expired, retrying (${attempts}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }

        // Final attempt failed
        if (attempts >= maxAttempts) {
          // Only log/toast if user is still authenticated
          if (isPrivyAuthenticated) {
            console.error('Failed to fetch delegations after retries:', error);
            toast({
              title: 'Error',
              description: 'Failed to load delegations. Please try again.',
              variant: 'destructive',
            });
          }
          setDelegations([]);
        }
      }
    }

    setLoading(false);
  }, [canFetchData, chainId, getBackendToken, isPrivyAuthenticated, userAddress, toast]);

  /**
   * Fetch delegation statistics
   */
  const fetchStats = useCallback(async () => {
    if (!canFetchData) {
      setStats(null);
      return;
    }

    try {
      const token = await getBackendToken();
      if (!token) return;

      const data = await delegationsApi.getDelegationStats(token, userAddress);
      setStats(data);
    } catch (error: any) {
      // Silent fail for stats (non-critical)
      if (isPrivyAuthenticated) {
        console.error('Failed to fetch stats:', error);
      }
      setStats(null);
    }
  }, [canFetchData, getBackendToken, isPrivyAuthenticated, userAddress]);

  /**
   * Create a new delegation with EIP-712 signature
   *
   * @param strategyId - Strategy to delegate (optional - can be linked later)
   * @param delegateAddress - Bot executor address (optional, uses default)
   * @param selectedChainId - Chain to create delegation on
   * @param delegatorAddress - DeleGator smart account address (optional, uses userAddress)
   */
  const createDelegation = useCallback(
    async (
      strategyId: string | undefined,
      delegateAddress: `0x${string}` | null,
      selectedChainId: number,
      delegatorAddress?: `0x${string}`
    ): Promise<Delegation | null> => {
      // Validation: Must be authenticated with Privy
      if (!isPrivyAuthenticated) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in to create a delegation',
          variant: 'destructive',
        });
        return null;
      }

      // Validation: Must have wallet and address
      const privyWallet = wallets[0];
      if (!privyWallet || !userAddress) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet',
          variant: 'destructive',
        });
        return null;
      }

      try {
        setCreating(true);

        // Use default bot executor if not provided
        const finalDelegateAddress = delegateAddress || getBotExecutorAddress(selectedChainId);

        // 1. Generate delegation data
        const delegationData: DelegationData = {
          delegate: finalDelegateAddress,
          delegator: delegatorAddress || userAddress, // DeleGator smart account or EOA
          authority: createRootAuthority(), // Root delegation (no parent)
          caveats: createEmptyCaveats(), // No restrictions for MVP
          salt: generateDelegationSalt(), // Random 256-bit salt
          deadline: 0n, // No expiration (0 = infinite)
        };

        // 2. Switch wallet to target chain
        const chainName = selectedChainId === 10143 ? 'Monad Testnet' : 'Base Sepolia';
        toast({
          title: 'Switching network',
          description: `Switching to ${chainName}...`,
        });

        try {
          await privyWallet.switchChain(selectedChainId);
        } catch (switchError: any) {
          // User cancelled or chain not supported
          throw new Error(`Failed to switch to ${chainName}. Please switch manually in your wallet.`);
        }

        // 3. Create viem WalletClient from Privy wallet (AFTER switching)
        const provider = await privyWallet.getEthereumProvider(); // Fresh provider after switch
        const chain = getChainById(selectedChainId);

        if (!chain) {
          throw new Error(`Unsupported chain ID: ${selectedChainId}`);
        }

        const viemWalletClient = createWalletClient({
          account: userAddress,
          chain,
          transport: custom(provider),
        });

        // DEBUG: Log wallet details before signing
        console.log('🔍 DEBUG - About to sign delegation:');
        console.log('  - Privy wallet address:', privyWallet.address);
        console.log('  - userAddress:', userAddress);
        console.log('  - wallets[0].address:', wallets[0]?.address);
        console.log('  - Chain:', selectedChainId);
        console.log('  - DelegationData.delegator:', delegationData.delegator);

        // 4. Sign delegation with EIP-712
        toast({
          title: 'Signature required',
          description: 'Please sign the delegation in your wallet',
        });

        const signature = await signDelegation(
          viemWalletClient,
          userAddress,
          delegationData,
          selectedChainId
        );

        // DEBUG: Log signature
        console.log('✅ Signature created:', signature);

        // 5. Submit to backend
        toast({
          title: 'Creating delegation...',
          description: 'Submitting to backend',
        });

        const token = await getBackendToken();
        if (!token) {
          throw new Error('Unable to retrieve backend JWT');
        }

        const createDto: CreateDelegationDto = {
          chainId: selectedChainId,
          strategyId: strategyId || undefined, // Only include if valid, otherwise undefined
          delegateAddress: finalDelegateAddress,
          delegationData,
          signature,
        };

        const delegation = await delegationsApi.createDelegation(createDto, token);

        // 6. Update local state
        setDelegations(prev => [delegation, ...prev]);
        setActiveDelegation(delegation);

        toast({
          title: 'Success!',
          description: 'Delegation created successfully',
        });

        // Refresh stats
        await fetchStats();

        console.log('✅ Delegation created successfully:', delegation.id);

        return delegation;
      } catch (error: any) {
        console.error('Failed to create delegation:', error);

        // User-friendly error messages
        if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
          toast({
            title: 'Signature cancelled',
            description: 'You cancelled the delegation signature',
          });
        } else if (error.message?.includes('Invalid or expired token') || error.message?.includes('401')) {
          toast({
            title: 'Authentication error',
            description: 'Backend JWT expired. Please try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: error.message || 'Failed to create delegation',
            variant: 'destructive',
          });
        }

        return null;
      } finally {
        setCreating(false);
      }
    },
    [isPrivyAuthenticated, userAddress, wallets, getBackendToken, toast, fetchStats]
  );

  /**
   * Revoke an existing delegation
   */
  const revokeDelegation = useCallback(
    async (delegationId: string): Promise<boolean> => {
      if (!canFetchData) return false;

      try {
        const token = await getBackendToken();
        if (!token) {
          throw new Error('Unable to retrieve backend JWT');
        }

        await delegationsApi.revokeDelegation(delegationId, token, userAddress);

        // Update local state
        setDelegations(prev => prev.filter(d => d.id !== delegationId));

        if (activeDelegation?.id === delegationId) {
          setActiveDelegation(null);
        }

        toast({
          title: 'Revoked',
          description: 'Delegation revoked successfully',
        });

        // Refresh stats
        await fetchStats();

        console.log('✅ Delegation revoked successfully');

        return true;
      } catch (error: any) {
        console.error('Failed to revoke delegation:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to revoke delegation',
          variant: 'destructive',
        });
        return false;
      }
    },
    [canFetchData, getBackendToken, activeDelegation, userAddress, toast, fetchStats]
  );

  /**
   * Select a different active delegation
   */
  const selectDelegation = useCallback((delegation: Delegation | null) => {
    setActiveDelegation(delegation);
  }, []);

  /**
   * Effect: Fetch data when authentication is ready
   * Cleanup when user logs out
   */
  useEffect(() => {
    if (canFetchData && !fetchedRef.current) {
      // User is fully authenticated and ready - fetch data
      fetchedRef.current = true;
      fetchDelegations();
      fetchStats();
    } else if (!canFetchData) {
      // User logged out or not authenticated - cleanup
      fetchedRef.current = false;
      setDelegations([]);
      setActiveDelegation(null);
      setStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetchData]); // Intentionally omit fetch callbacks to avoid infinite loop

  /**
   * Effect: Refetch when chainId changes (if authenticated)
   */
  useEffect(() => {
    if (canFetchData && fetchedRef.current) {
      fetchDelegations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, canFetchData]); // Intentionally omit fetchDelegations to avoid infinite loop

  return {
    // State
    delegations,
    activeDelegation,
    stats,
    loading,
    creating,
    isConnected: isPrivyAuthenticated && !!userAddress,
    isReady: canFetchData,
    userAddress,

    // Actions
    createDelegation,
    revokeDelegation,
    selectDelegation,
    refreshDelegations: fetchDelegations,
    refreshStats: fetchStats,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { strategiesApi } from '@/lib/api/strategies';
import {
  CreateStrategyDto,
  ApiStrategy,
} from '@/lib/types/api-strategy';
import { Strategy } from '@/lib/types/strategy';
import { BlockType } from '@/lib/types/blocks';
import type { AssetBlock, ActionBlock } from '@/lib/types/blocks';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

/**
 * Strategy Hook - Production Quality
 *
 * Features:
 * - Convert canvas Strategy to backend CreateStrategyDto
 * - Uses hybrid Privy + SIWE authentication
 * - Retry logic (3 attempts) for transient failures
 * - Graceful error handling
 * - Auto cleanup on logout
 */
export function useStrategy(chainId?: number) {
  const { isPrivyAuthenticated, getBackendToken, isBackendAuthenticated } = useAuth();
  const { wallets } = useWallets();
  const { toast } = useToast();

  // State
  const [strategies, setStrategies] = useState<ApiStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Track if we've already fetched to avoid duplicate requests
  const fetchedRef = useRef(false);

  const wallet = wallets[0];
  const userAddress = wallet?.address as `0x${string}` | undefined;

  // Only fetch when fully authenticated (both Privy and backend)
  const canFetchData = isPrivyAuthenticated && isBackendAuthenticated && userAddress;


  /**
   * Convert canvas Strategy to CreateStrategyDto
   * Extracts tokens, weights, and rebalance interval from blocks
   */
  const convertCanvasToDto = useCallback((
    canvasStrategy: Strategy,
    targetChainId: number
  ): CreateStrategyDto | null => {
    try {
      // Extract asset blocks
      const assetBlocks = canvasStrategy.blocks.filter(
        (b): b is AssetBlock => b.type === BlockType.ASSET
      );

      if (assetBlocks.length === 0) {
        throw new Error('Strategy must have at least one asset');
      }

      // Validate all assets are on same chain
      const chainIds = new Set(assetBlocks.map(b => b.data.chainId));
      if (chainIds.size > 1) {
        throw new Error('All assets must be on the same chain');
      }

      const strategyChainId = assetBlocks[0].data.chainId;

      // Validate target chain matches strategy chain
      if (strategyChainId !== targetChainId) {
        throw new Error(`Strategy chain (${strategyChainId}) must match target chain (${targetChainId})`);
      }

      // Extract tokens and weights
      const tokens = assetBlocks.map(b => b.data.address);
      const weights = assetBlocks.map(b => Math.round(b.data.initialWeight * 100)); // Convert % to basis points

      // Validate weights sum to 10000 basis points (100%)
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      if (Math.abs(totalWeight - 10000) > 1) {
        throw new Error(`Weights must sum to 100% (got ${totalWeight / 100}%)`);
      }

      // Find rebalance interval from action blocks (default: 1 hour = 3600 seconds)
      let rebalanceInterval = 3600; // Default 1 hour
      const actionBlocks = canvasStrategy.blocks.filter(
        (b): b is ActionBlock => b.type === BlockType.ACTION
      );

      for (const action of actionBlocks) {
        if (action.data.actionType === 'rebalance' && action.data.rebalanceTrigger?.interval) {
          // Convert minutes to seconds
          rebalanceInterval = action.data.rebalanceTrigger.interval * 60;
          break;
        }
      }

      return {
        chainId: strategyChainId,
        tokens,
        weights,
        rebalanceInterval,
        strategyLogic: canvasStrategy, // Send complete canvas strategy to backend
      };
    } catch (error: any) {
      console.error('Failed to convert canvas strategy:', error);
      toast({
        title: 'Invalid Strategy',
        description: error.message || 'Failed to convert strategy',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  /**
   * Fetch strategies with retry logic
   */
  const fetchStrategies = useCallback(async () => {
    // Don't fetch if not ready
    if (!canFetchData) {
      setStrategies([]);
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
          throw new Error('Unable to retrieve backend JWT. Please ensure you are authenticated.');
        }

        const response = await strategiesApi.getStrategies(token, chainId);

        // Backend returns array directly, not wrapped in { strategies: [], count: 0 }
        // Handle both formats for backward compatibility
        const strategiesList = Array.isArray(response)
          ? response
          : response.strategies || [];

        setStrategies(strategiesList);

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
            console.error('Failed to fetch strategies after retries:', error);
            toast({
              title: 'Error',
              description: 'Failed to load strategies. Please try again.',
              variant: 'destructive',
            });
          }
          setStrategies([]);
        }
      }
    }

    setLoading(false);
  }, [canFetchData, chainId, getBackendToken, isPrivyAuthenticated, toast]);

  /**
   * Save current canvas strategy to backend
   * Converts canvas Strategy to CreateStrategyDto and submits to API
   */
  const saveStrategy = useCallback(
    async (canvasStrategy: Strategy, targetChainId: number): Promise<ApiStrategy | null> => {
      // Validation: Must be authenticated with Privy
      if (!isPrivyAuthenticated) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in to save a strategy',
          variant: 'destructive',
        });
        return null;
      }

      // Validation: Must have wallet and address
      if (!wallet || !userAddress) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet',
          variant: 'destructive',
        });
        return null;
      }

      try {
        setSaving(true);

        toast({
          title: 'Saving strategy...',
          description: 'Converting and validating strategy',
        });

        // Convert canvas strategy to DTO
        const dto = convertCanvasToDto(canvasStrategy, targetChainId);
        if (!dto) {
          return null; // Error already toasted in convertCanvasToDto
        }

        // Get backend JWT token
        const token = await getBackendToken();
        if (!token) {
          throw new Error('Unable to retrieve backend JWT. Please ensure you are authenticated.');
        }

        // Submit to backend
        toast({
          title: 'Creating strategy...',
          description: 'Submitting to backend',
        });

        const strategy = await strategiesApi.createStrategy(dto, token);

        // Update local state (defensive: ensure prev is always an array)
        setStrategies(prev => [strategy, ...(Array.isArray(prev) ? prev : [])]);

        toast({
          title: 'Success!',
          description: `Strategy "${canvasStrategy.name}" saved successfully`,
        });

        console.log('✅ Strategy created successfully:', strategy.id);

        return strategy;
      } catch (error: any) {
        console.error('Failed to save strategy:', error);

        if (error.message?.includes('Invalid or expired token') || error.message?.includes('401')) {
          toast({
            title: 'Authentication error',
            description: 'Backend JWT expired. Please try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: error.message || 'Failed to save strategy',
            variant: 'destructive',
          });
        }

        return null;
      } finally {
        setSaving(false);
      }
    },
    [isPrivyAuthenticated, userAddress, wallet, getBackendToken, toast, convertCanvasToDto]
  );

  /**
   * Delete/deactivate a strategy
   */
  const deleteStrategy = useCallback(
    async (strategyId: string): Promise<boolean> => {
      if (!canFetchData) return false;

      try {
        const token = await getBackendToken();
        if (!token) {
          throw new Error('Unable to retrieve backend JWT');
        }

        await strategiesApi.deleteStrategy(strategyId, token);

        // Update local state (defensive: ensure prev is always an array)
        setStrategies(prev => (Array.isArray(prev) ? prev.filter(s => s.id !== strategyId) : []));

        toast({
          title: 'Deleted',
          description: 'Strategy deleted successfully',
        });

        console.log('✅ Strategy deleted successfully');

        return true;
      } catch (error: any) {
        console.error('Failed to delete strategy:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete strategy',
          variant: 'destructive',
        });
        return false;
      }
    },
    [canFetchData, getBackendToken, toast]
  );

  /**
   * Effect: Fetch data when authentication is ready
   * Cleanup when user logs out
   */
  useEffect(() => {
    if (canFetchData && !fetchedRef.current) {
      // User is fully authenticated and ready - fetch data
      fetchedRef.current = true;
      fetchStrategies();
    } else if (!canFetchData) {
      // User logged out or not authenticated - cleanup
      fetchedRef.current = false;
      setStrategies([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetchData]); // Intentionally omit fetchStrategies to avoid infinite loop

  /**
   * Effect: Refetch when chainId changes (if authenticated)
   * Reset fetchedRef to ensure fresh data for new chain
   */
  useEffect(() => {
    if (canFetchData) {
      // Reset fetchedRef to force refetch for new chainId
      fetchedRef.current = false;
      fetchStrategies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, canFetchData]); // Intentionally omit fetchStrategies to avoid infinite loop

  return {
    // State
    strategies,
    loading,
    saving,
    isConnected: isPrivyAuthenticated && !!userAddress,
    isReady: canFetchData,
    userAddress,

    // Actions
    saveStrategy,
    deleteStrategy,
    refreshStrategies: fetchStrategies,
    convertCanvasToDto, // Expose for validation
  };
}

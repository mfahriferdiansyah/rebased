import { useState, useEffect, useCallback, useRef } from 'react';
import { rebalancesApi } from '@/lib/api/rebalances';
import {
  Rebalance,
  RebalanceStatsResponse,
  GetRebalancesQuery,
} from '@/lib/types/rebalance';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

/**
 * Rebalances Hook - Fetch and manage rebalance history
 *
 * Features:
 * - Fetch rebalances with optional filters
 * - Get rebalance statistics
 * - Auto cleanup on logout
 * - Retry logic for transient failures
 */
export function useRebalances(initialQuery?: GetRebalancesQuery) {
  const { isPrivyAuthenticated, getBackendToken, isBackendAuthenticated } = useAuth();
  const { toast } = useToast();

  // State
  const [rebalances, setRebalances] = useState<Rebalance[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<RebalanceStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Track if we've already fetched to avoid duplicate requests
  const fetchedRef = useRef(false);

  // Only fetch when fully authenticated
  const canFetchData = isPrivyAuthenticated && isBackendAuthenticated;

  /**
   * Fetch rebalances with retry logic
   */
  const fetchRebalances = useCallback(async (query?: GetRebalancesQuery) => {
    if (!canFetchData) {
      setRebalances([]);
      setTotal(0);
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

        const response = await rebalancesApi.getRebalances(token, query);

        setRebalances(response.data);
        setTotal(response.total);

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
            console.error('Failed to fetch rebalances after retries:', error);
            toast({
              title: 'Error',
              description: 'Failed to load rebalance history. Please try again.',
              variant: 'destructive',
            });
          }
          setRebalances([]);
          setTotal(0);
        }
      }
    }

    setLoading(false);
  }, [canFetchData, getBackendToken, isPrivyAuthenticated, toast]);

  /**
   * Fetch rebalance statistics
   */
  const fetchStats = useCallback(async (chainId?: number) => {
    if (!canFetchData) {
      setStats(null);
      return;
    }

    setLoadingStats(true);

    try {
      const token = await getBackendToken();
      if (!token) {
        throw new Error('Unable to retrieve backend JWT. Please ensure you are authenticated.');
      }

      const response = await rebalancesApi.getStats(token, chainId);
      setStats(response);

    } catch (error: any) {
      console.error('Failed to fetch rebalance stats:', error);
      setStats(null);
    }

    setLoadingStats(false);
  }, [canFetchData, getBackendToken]);

  /**
   * Effect: Fetch data when authentication is ready
   * Cleanup when user logs out
   */
  useEffect(() => {
    if (canFetchData && !fetchedRef.current) {
      // User is fully authenticated and ready - fetch data
      fetchedRef.current = true;
      fetchRebalances(initialQuery);
      fetchStats(initialQuery?.chainId);
    } else if (!canFetchData) {
      // User logged out or not authenticated - cleanup
      fetchedRef.current = false;
      setRebalances([]);
      setTotal(0);
      setStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetchData]);

  return {
    // State
    rebalances,
    total,
    stats,
    loading,
    loadingStats,
    isReady: canFetchData,

    // Actions
    refreshRebalances: fetchRebalances,
    refreshStats: fetchStats,
  };
}

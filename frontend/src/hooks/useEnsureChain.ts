import { useSwitchChain, useChainId } from 'wagmi';
import { defaultChain } from '@/lib/chains';
import { toast } from 'sonner';
import { useCallback } from 'react';

/**
 * Hook to ensure user is on the correct chain before performing actions
 * 
 * Usage:
 * ```tsx
 * const ensureChain = useEnsureChain();
 * 
 * const handleDeploy = async () => {
 *   const switched = await ensureChain();
 *   if (!switched) return; // User cancelled or error
 *   
 *   // Proceed with deployment
 *   await deployContract();
 * };
 * ```
 */
export function useEnsureChain() {
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const ensureChain = useCallback(
    async (targetChainId?: number): Promise<boolean> => {
      const targetId = targetChainId || defaultChain.id;

      // Already on correct chain
      if (currentChainId === targetId) {
        return true;
      }

      try {
        // Show switching notification
        const toastId = toast.loading('Switching network...', {
          description: `Please approve the network switch to ${defaultChain.name}`,
        });

        // Request chain switch
        await switchChainAsync({ chainId: targetId });

        // Success
        toast.success('Network switched', {
          id: toastId,
          description: `Successfully switched to ${defaultChain.name}`,
        });

        return true;
      } catch (error: any) {
        // User rejected or error occurred
        if (error.code === 4001 || error.message?.includes('User rejected')) {
          toast.error('Network switch cancelled', {
            description: 'You must switch to Base to continue',
          });
        } else {
          toast.error('Network switch failed', {
            description: error.message || 'Failed to switch network',
          });
        }

        return false;
      }
    },
    [currentChainId, switchChainAsync]
  );

  return ensureChain;
}

/**
 * Higher-order function wrapper for actions that require specific chain
 * 
 * Usage:
 * ```tsx
 * const ensureChain = useEnsureChain();
 * 
 * const handleAction = useWithChainCheck(async () => {
 *   await deployContract();
 * });
 * ```
 */
export function useWithChainCheck() {
  const ensureChain = useEnsureChain();

  return useCallback(
    async <T>(
      action: () => Promise<T>,
      targetChainId?: number
    ): Promise<T | null> => {
      const switched = await ensureChain(targetChainId);
      if (!switched) return null;

      return await action();
    },
    [ensureChain]
  );
}

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
  Shield,
  X,
  RotateCcw,
  Network,
} from 'lucide-react';
import { useDelegation } from '@/hooks/useDelegation';
import { getBotExecutorAddress } from '@/lib/utils/delegation-signatures';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { monadTestnet } from '@/lib/chains';
import { toast } from 'sonner';
import type { Address } from 'viem';

interface DelegationStepProps {
  delegatorAddress: Address;
  strategyId?: string;
  chainId: number;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

/**
 * DelegationStep Component
 *
 * Step 3 of Strategy Setup Wizard
 * - Creates ERC-7710 delegation for the bot
 * - Signs delegation with user's wallet
 * - Stores delegation in backend
 */
export function DelegationStep({
  delegatorAddress,
  strategyId,
  chainId,
  onNext,
  onBack,
  onCancel,
}: DelegationStepProps) {
  const { authenticated, ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const {
    createDelegation,
    delegations,
    loading: delegationsLoading,
  } = useDelegation(chainId);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delegationCreated, setDelegationCreated] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const networkSwitchTriggeredRef = useRef(false);

  // Get wallet from Privy
  const wallet = wallets[0];

  // Get chain ID from Privy wallet (works on ANY network)
  const walletChainId = wallet?.chainId;
  const chainIdNumber = walletChainId?.includes(':')
    ? parseInt(walletChainId.split(':')[1])
    : walletChainId ? parseInt(walletChainId) : undefined;

  // Network validation
  const isOnWrongNetwork = privyReady && authenticated && wallet && chainIdNumber !== monadTestnet.id;

  /**
   * Handle network switch to Monad testnet using Privy's wallet.switchChain()
   */
  const handleNetworkSwitch = async () => {
    if (!wallet) {
      console.error('No wallet available for network switch');
      return;
    }

    try {
      setIsSwitching(true);
      console.log('🔄 [DelegationStep] Switching network using Privy wallet.switchChain()...');

      // Use Privy's native wallet.switchChain() method
      await wallet.switchChain(monadTestnet.id);

      toast.success('Network switched', {
        description: `Switched to ${monadTestnet.name}`,
      });

      networkSwitchTriggeredRef.current = false;
      console.log('✅ [DelegationStep] Network switched successfully');

      // Wait for wagmi to sync with the new network
      console.log('⏳ [DelegationStep] Waiting for wagmi to sync with new network...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('✅ [DelegationStep] Wagmi sync delay complete');
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      if (!error.message?.includes('User rejected') && !error.message?.includes('rejected') && !error.message?.includes('User denied')) {
        toast.error('Network switch failed', {
          description: error.message || 'Please switch to Monad Testnet manually in your wallet',
        });
      }
    } finally {
      setIsSwitching(false);
    }
  };

  /**
   * Reset network switch flag when user successfully switches to correct network
   */
  useEffect(() => {
    if (!isOnWrongNetwork && networkSwitchTriggeredRef.current) {
      console.log('✅ [DelegationStep] User on correct network - resetting switch flag');
      networkSwitchTriggeredRef.current = false;
    }
  }, [isOnWrongNetwork]);

  /**
   * Auto-trigger network switch when step opens on wrong network
   */
  useEffect(() => {
    if (isOnWrongNetwork && !isSwitching && !networkSwitchTriggeredRef.current) {
      console.log('🔄 [DelegationStep] Auto-triggering network switch to Monad Testnet...');
      networkSwitchTriggeredRef.current = true;
      handleNetworkSwitch();
    }
  }, [isOnWrongNetwork, isSwitching, handleNetworkSwitch]);

  /**
   * Cleanup on unmount - abort any pending operations
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Check if delegation already exists
  const existingDelegation = delegations.find(
    d => d.userAddress.toLowerCase() === delegatorAddress.toLowerCase() && d.isActive
  );

  // Wrong network - show banner (but still allow viewing UI)
  const wrongNetworkBanner = isOnWrongNetwork && (
    <Alert className="bg-orange-50 border-orange-200">
      <Network className="w-4 h-4 text-orange-600" />
      <AlertDescription className="text-sm text-orange-700">
        <div className="flex items-center justify-between">
          <span>
            You're on the wrong network. Please switch to <strong>Monad Testnet</strong> to create delegation.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNetworkSwitch}
            disabled={isSwitching}
            className="ml-2 border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isSwitching ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <Network className="w-3 h-3 mr-1" />
                Switch Network
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  /**
   * Cancel ongoing operation
   */
  const handleCancelOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCreating(false);
    setError('Operation cancelled. You can retry when ready.');
  };

  /**
   * Reset error state for retry
   */
  const handleRetry = () => {
    setError(null);
  };

  /**
   * Handle delegation creation
   */
  const handleCreateDelegation = async () => {
    // Check network FIRST before any operation
    if (isOnWrongNetwork) {
      console.warn('⚠️ Wrong network detected - triggering switch before delegation');
      await handleNetworkSwitch();
      return;
    }

    try {
      setCreating(true);
      setError(null);

      // Create new AbortController for this operation
      abortControllerRef.current = new AbortController();

      // Get bot executor address from environment configuration
      const botAddress = getBotExecutorAddress(chainId);

      const delegation = await createDelegation(
        strategyId,
        botAddress,
        chainId,
        delegatorAddress // Pass DeleGator smart account address
      );

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      if (delegation) {
        setDelegationCreated(true);
        // Auto-advance after brief delay
        setTimeout(() => {
          onNext();
        }, 1500);
      } else {
        throw new Error('Delegation creation returned null');
      }
    } catch (err: any) {
      // Don't show error if user manually cancelled
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        return;
      }
      console.error('Failed to create delegation:', err);
      setError(err.message || 'Failed to create delegation');
    } finally {
      setCreating(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Handle proceeding with existing delegation
   */
  const handleProceedWithExisting = () => {
    onNext();
  };

  // Delegation already exists
  if (existingDelegation) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900">Delegation Found</h3>
          <p className="text-sm text-gray-600 mt-1">
            An active delegation already exists for this smart account.
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="font-medium text-green-900">Active Delegation</h4>
                <p className="text-sm text-green-700 mt-1">
                  The Rebased bot is authorized to execute rebalances on your behalf.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-700">Delegate:</span>
                  <span className="font-mono text-green-900">
                    {existingDelegation.delegateAddress.slice(0, 10)}...
                    {existingDelegation.delegateAddress.slice(-8)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-700">Created:</span>
                  <span className="text-green-900">
                    {new Date(existingDelegation.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {existingDelegation.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-green-700">Expires:</span>
                    <span className="text-green-900">
                      {new Date(existingDelegation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            You can manage or revoke this delegation at any time from the Delegation Manager.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between gap-2 pt-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          <Button
            onClick={handleProceedWithExisting}
            className="bg-gray-900 hover:bg-gray-800"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Delegation successfully created
  if (delegationCreated) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-center">
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <div>
                <h4 className="font-medium text-green-900">Delegation Created!</h4>
                <p className="text-sm text-green-700 mt-1">
                  The bot is now authorized to execute your strategy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create delegation flow
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-900">Create Delegation</h3>
        <p className="text-sm text-gray-600 mt-1">
          Authorize the Rebased bot to execute rebalances for your strategy.
        </p>
      </div>

      {/* Network warning banner */}
      {wrongNetworkBanner}

      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">ERC-7710 Delegation</h4>
            <p className="text-sm text-gray-600 mt-1">
              You'll sign a delegation message that grants limited permissions to the bot.
              This delegation is revocable at any time.
            </p>
          </div>
        </div>

        <div className="pl-11 space-y-2 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <span>Only allows rebalance operations for your strategies</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <span>Does not grant access to withdraw or transfer funds</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <span>Can be revoked instantly through the Delegation Manager</span>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-sm">
          <strong>What happens next:</strong>
          <br />
          1. You'll be prompted to sign a delegation message in your wallet
          <br />
          2. The signature will be stored securely in the backend
          <br />
          3. The bot will use this delegation to execute rebalances when conditions are met
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state with cancel option */}
      {creating && (
        <Alert>
          <Loader2 className="w-4 h-4 animate-spin" />
          <AlertDescription className="text-sm">
            <div className="flex items-center justify-between">
              <span>Creating delegation... Waiting for signature.</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelOperation}
                className="h-auto p-1 hover:bg-transparent"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              If the wallet popup doesn't appear, try clicking Cancel and retry.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={creating || delegationsLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={creating || delegationsLoading}
          >
            Cancel
          </Button>
        </div>

        <div className="flex gap-2">
          {/* Retry button appears after error */}
          {error && !creating && (
            <Button
              variant="outline"
              onClick={handleRetry}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear Error
            </Button>
          )}

          <Button
            onClick={handleCreateDelegation}
            disabled={creating || delegationsLoading}
            className="bg-gray-900 hover:bg-gray-800"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {error ? 'Retry' : 'Create Delegation'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

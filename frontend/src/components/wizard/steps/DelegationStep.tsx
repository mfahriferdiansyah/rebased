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
} from 'lucide-react';
import { useDelegation } from '@/hooks/useDelegation';
import { getBotExecutorAddress } from '@/lib/utils/delegation-signatures';
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
  const {
    createDelegation,
    delegations,
    loading: delegationsLoading,
  } = useDelegation(chainId);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delegationCreated, setDelegationCreated] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

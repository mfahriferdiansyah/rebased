import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowRight,
  Loader2,
  Info,
} from 'lucide-react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';

interface SmartAccountStepProps {
  onNext: (delegatorAddress: Address) => void;
  onCancel: () => void;
}

/**
 * SmartAccountStep Component
 *
 * Step 1 of Strategy Setup Wizard
 * - Checks if user has a DeleGator smart account
 * - Provides option to create one if not found
 * - Proceeds to next step once DeleGator is confirmed
 */
export function SmartAccountStep({ onNext, onCancel }: SmartAccountStepProps) {
  const { address: userAddress } = useAccount();
  const {
    status,
    checkDeleGatorStatus,
    createDeleGator,
  } = useSmartAccount();

  const [checking, setChecking] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check DeleGator status on mount
   */
  useEffect(() => {
    const checkStatus = async () => {
      if (!userAddress) {
        setChecking(false);
        return;
      }

      try {
        setChecking(true);
        setError(null);
        await checkDeleGatorStatus(userAddress);
      } catch (err: any) {
        setError(err.message || 'Failed to check smart account status');
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [userAddress, checkDeleGatorStatus]);

  /**
   * Handle DeleGator creation
   */
  const handleCreateDeleGator = async () => {
    if (!userAddress) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const delegatorAddress = await createDeleGator(userAddress);

      // Verify creation was successful
      await checkDeleGatorStatus(userAddress);

      if (delegatorAddress) {
        // Auto-advance to next step
        onNext(delegatorAddress);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create smart account');
    } finally {
      setCreating(false);
    }
  };

  /**
   * Handle proceeding to next step with existing DeleGator
   */
  const handleProceedWithExisting = () => {
    if (status.delegatorAddress) {
      onNext(status.delegatorAddress);
    } else {
      setError('No DeleGator address found');
    }
  };

  // Wallet not connected
  if (!userAddress) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-gray-100 p-2">
            <Wallet className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Smart Account Required</h3>
            <p className="text-sm text-gray-600 mt-1">
              Connect your wallet to check for an existing smart account or create a new one.
            </p>
          </div>
        </div>

        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            A DeleGator smart account is required for automated strategy execution.
            This account allows the bot to execute rebalances on your behalf with signed delegations.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Checking status
  if (checking) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto" />
            <div className="text-sm text-gray-600">
              Checking for existing smart account...
            </div>
            <div className="text-xs text-gray-500">
              Address: {userAddress.slice(0, 10)}...{userAddress.slice(-8)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has DeleGator - show confirmation
  if (status.hasDeleGator && status.delegatorAddress) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900">Smart Account Found</h3>
              <p className="text-sm text-green-700 mt-1">
                Your DeleGator smart account is ready for use.
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-700 font-medium">DeleGator Address:</span>
                  <Badge variant="outline" className="font-mono text-xs bg-white">
                    {status.delegatorAddress.slice(0, 10)}...{status.delegatorAddress.slice(-8)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            Your strategy funds and delegations will be managed through this smart account.
            Make sure to transfer funds to this address before activating your strategy.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
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

  // No DeleGator - show creation option
  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-6 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-amber-900">No Smart Account Found</h3>
            <p className="text-sm text-amber-700 mt-1">
              You need a DeleGator smart account to use automated strategy execution.
            </p>

            <div className="mt-4 space-y-2 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5" />
                <span>Secure smart contract wallet for automated trading</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5" />
                <span>Enables delegation-based execution without sharing keys</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5" />
                <span>Full control over permissions and strategy funds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-sm">
          <strong>What is a DeleGator?</strong>
          <br />
          A DeleGator is a MetaMask smart account (ERC-4337) that implements delegation functionality.
          It allows you to grant limited permissions to the Rebased bot to execute rebalances
          on your behalf, without giving up custody of your funds.
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-900 space-y-2">
          <div className="font-medium">Setup Requirements:</div>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>MetaMask Delegation Toolkit must be installed</li>
            <li>Gas fees required for smart account deployment</li>
            <li>One-time setup (reusable across strategies)</li>
          </ul>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={creating}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateDeleGator}
          disabled={creating}
          className="bg-gray-900 hover:bg-gray-800"
        >
          {creating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Smart Account...
            </>
          ) : (
            <>
              Create Smart Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  Shield,
  Clock,
  Loader2,
  Info,
  Link2,
  XCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDelegation } from '@/hooks/useDelegation';
import { getChainById } from '@/lib/chains';
import type { Address } from 'viem';

interface DelegationManagementStepProps {
  delegatorAddress: Address;
  chainId: number;
  onRevoke: () => void; // Callback to reset wizard to step 1
  onFinish: () => void; // Callback to close wizard
}

/**
 * DelegationManagementStep Component
 *
 * Step 6 of Strategy Setup Wizard (NEW)
 * - View active delegation details
 * - Revoke delegation with confirmation
 * - Link to strategy (optional)
 * - When revoked → trigger wizard reset to step 1
 */
export function DelegationManagementStep({
  delegatorAddress,
  chainId,
  onRevoke,
  onFinish,
}: DelegationManagementStepProps) {
  const {
    delegations,
    activeDelegation,
    stats,
    loading,
    revokeDelegation,
    refreshDelegations,
  } = useDelegation(chainId);

  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const chain = getChainById(chainId);

  /**
   * Handle delegation revocation
   */
  const handleRevoke = async () => {
    if (!activeDelegation) return;

    try {
      setRevoking(true);
      const success = await revokeDelegation(activeDelegation.id);

      if (success) {
        setShowRevokeDialog(false);
        // Trigger wizard reset to step 1
        onRevoke();
      }
    } catch (error) {
      console.error('Failed to revoke delegation:', error);
    } finally {
      setRevoking(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <div className="text-sm text-gray-500 mt-2">Loading delegation...</div>
      </div>
    );
  }

  // No active delegation - should not happen in normal flow
  if (!activeDelegation) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            No active delegation found. Please create a new delegation.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end pt-4">
          <Button
            onClick={onRevoke}
            className="bg-gray-900 hover:bg-gray-800"
          >
            Create New Delegation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-medium text-gray-900">Delegation Management</h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage your active delegation and strategy settings.
        </p>
      </div>

      {/* Active Delegation Card */}
      <div className="border rounded-lg p-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-green-100 p-2">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 space-y-4">
            {/* Title & Status */}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-green-900">Active Delegation</h4>
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
              <p className="text-sm text-green-700 mt-1">
                The Rebased bot is authorized to execute rebalances on your behalf.
              </p>
            </div>

            {/* Delegation Details */}
            <div className="space-y-2">
              {/* Delegate Address */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700 font-medium">Delegate Address:</span>
                <span className="font-mono text-green-900">
                  {activeDelegation.delegateAddress.slice(0, 10)}...
                  {activeDelegation.delegateAddress.slice(-8)}
                </span>
              </div>

              {/* Delegator Address */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700 font-medium">Smart Account:</span>
                <span className="font-mono text-green-900">
                  {delegatorAddress.slice(0, 10)}...
                  {delegatorAddress.slice(-8)}
                </span>
              </div>

              {/* Chain */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700 font-medium">Chain:</span>
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                  {chain?.name || `Chain ${chainId}`}
                </Badge>
              </div>

              {/* Created Date */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700 font-medium">Created:</span>
                <div className="flex items-center gap-1.5 text-green-900">
                  <Clock className="w-3 h-3" />
                  {new Date(activeDelegation.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Expiry (if applicable) */}
              {activeDelegation.expiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700 font-medium">Expires:</span>
                  <span className="text-green-900">
                    {new Date(activeDelegation.expiresAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Strategy Link Status */}
            {activeDelegation.strategyId && (
              <div className="pt-3 border-t border-green-200">
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 font-medium">
                    Linked to Strategy
                  </span>
                  <span className="font-mono text-green-900">
                    {activeDelegation.strategyId}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics (if available) */}
      {stats && (
        <div className="border rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">
            Your Delegation Statistics
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalDelegations}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">
                {stats.activeDelegations}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700">
                {stats.revokedDelegations}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Revoked</div>
            </div>
          </div>
        </div>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-sm">
          <strong>Security & Control:</strong>
          <br />
          • Your funds remain in your smart account at all times
          <br />
          • You can revoke this delegation anytime
          <br />
          • The bot can only execute rebalances according to your strategy rules
          <br />• All transactions are visible on the blockchain explorer
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex justify-between gap-2 pt-4">
        <Button
          variant="destructive"
          onClick={() => setShowRevokeDialog(true)}
          disabled={revoking}
        >
          {revoking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Revoking...
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 mr-2" />
              Revoke Delegation
            </>
          )}
        </Button>

        <Button
          onClick={onFinish}
          className="bg-gray-900 hover:bg-gray-800"
        >
          Close
        </Button>
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Delegation?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to revoke this delegation? This will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Remove the bot's authorization to execute rebalances</li>
                <li>Stop any automated strategy execution</li>
                <li>Require you to create a new delegation to resume automation</li>
              </ul>
              <p className="pt-2 text-amber-700 font-medium">
                After revoking, you'll be guided to create a new delegation if needed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-red-600 hover:bg-red-700"
            >
              {revoking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Delegation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

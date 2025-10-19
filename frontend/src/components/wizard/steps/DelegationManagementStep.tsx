import { useState, useEffect } from 'react';
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
  ExternalLink,
  Coins,
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
import { useAccount, useBalance } from 'wagmi';
import { formatEther, formatUnits, type Address } from 'viem';
import { strategiesApi } from '@/lib/api/strategies';
import { useAuth } from '@/hooks/useAuth';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import type { Strategy } from '@/lib/types/strategy';
import { BlockType, type AssetBlock } from '@/lib/types/blocks';
import { CanvasPreview } from '@/components/preview/CanvasPreview';

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
interface TokenBalance {
  address: Address;
  symbol: string;
  decimals: number;
  isNative: boolean;
  eoaBalance?: bigint;
  delegatorBalance?: bigint;
}

export function DelegationManagementStep({
  delegatorAddress,
  chainId,
  onRevoke,
  onFinish,
}: DelegationManagementStepProps) {
  const { address: userAddress } = useAccount();
  const { getBackendToken } = useAuth();
  const { getTokenBalance } = useSmartAccount();
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
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loadingStrategy, setLoadingStrategy] = useState(false);

  const chain = getChainById(chainId);

  // Get native balance for user's wallet and smart account
  const { data: userNativeBalance } = useBalance({
    address: userAddress,
  });
  const { data: smartAccountNativeBalance } = useBalance({
    address: delegatorAddress,
  });

  /**
   * Fetch strategy and token balances
   */
  useEffect(() => {
    const fetchStrategyAndBalances = async () => {
      if (!activeDelegation?.strategyId || !userAddress) return;

      try {
        setLoadingStrategy(true);

        // Fetch strategy from backend
        const token = await getBackendToken();
        if (!token) return;

        const strategyData = await strategiesApi.getStrategy(activeDelegation.strategyId, token);
        setStrategy(strategyData);

        // Extract asset blocks from strategyLogic
        const assetBlocks = (strategyData as any).strategyLogic?.blocks?.filter(
          (b: any) => b.type === BlockType.ASSET
        ) || [];

        // Get balances for each token
        const balances: TokenBalance[] = [];
        for (const asset of assetBlocks) {
          const isNative = asset.data.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

          let eoaBalance = 0n;
          let delegatorBalance = 0n;

          try {
            if (isNative) {
              eoaBalance = userNativeBalance?.value || 0n;
              delegatorBalance = smartAccountNativeBalance?.value || 0n;
            } else {
              eoaBalance = await getTokenBalance(asset.data.address as Address, userAddress, asset.data.decimals);
              delegatorBalance = await getTokenBalance(asset.data.address as Address, delegatorAddress, asset.data.decimals);
            }
          } catch (err) {
            console.error(`Failed to get balance for ${asset.data.symbol}:`, err);
          }

          balances.push({
            address: asset.data.address as Address,
            symbol: asset.data.symbol,
            decimals: asset.data.decimals,
            isNative,
            eoaBalance,
            delegatorBalance,
          });
        }

        setTokenBalances(balances);
      } catch (err) {
        console.error('Failed to fetch strategy:', err);
      } finally {
        setLoadingStrategy(false);
      }
    };

    fetchStrategyAndBalances();
  }, [activeDelegation?.strategyId, userAddress, userNativeBalance, smartAccountNativeBalance]);

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
              {/* Smart Account Address - Clickable */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700 font-medium">Smart Account:</span>
                <a
                  href={`${chain?.blockExplorers?.default?.url || ''}/address/${delegatorAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-green-900 hover:text-green-700 underline inline-flex items-center gap-1.5"
                >
                  {delegatorAddress.slice(0, 10)}...
                  {delegatorAddress.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
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

      {/* Strategy Visual Preview */}
      {activeDelegation.strategyId && strategy && (strategy as any).strategyLogic && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-900">
                Strategy Workflow
              </div>
              {(strategy as any).strategyLogic?.name && (
                <span className="text-xs text-gray-600">
                  ({(strategy as any).strategyLogic.name})
                </span>
              )}
            </div>
          </div>
          <div className="bg-white h-64">
            {loadingStrategy ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <CanvasPreview
                blocks={(strategy as any).strategyLogic.blocks || []}
                connections={(strategy as any).strategyLogic.connections || []}
                startBlockPos={(strategy as any).strategyLogic.startBlockPosition || { x: 50, y: 200 }}
                endBlockPos={(strategy as any).strategyLogic.endBlockPosition || { x: 800, y: 200 }}
              />
            )}
          </div>
        </div>
      )}

      {/* Fund Balances - Strategy Assets */}
      {activeDelegation.strategyId && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-gray-600" />
            <div className="text-sm font-medium text-gray-900">
              Fund Balances {strategy && `(${(strategy as any).name || (strategy as any).strategyLogic?.name})`}
            </div>
          </div>

          {loadingStrategy ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : tokenBalances.length > 0 ? (
            <div className="space-y-3">
              {tokenBalances.map((token) => (
                <div key={token.address} className="border rounded-lg p-3">
                  {/* Token Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full bg-gray-100 p-1.5">
                      <Coins className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div className="font-medium text-sm text-gray-900">{token.symbol}</div>
                  </div>

                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border rounded-lg p-2 bg-blue-50 border-blue-200">
                      <div className="text-xs text-blue-700 font-medium mb-0.5">Your Wallet</div>
                      <div className="text-base font-bold text-blue-900">
                        {token.eoaBalance !== undefined
                          ? token.isNative
                            ? formatEther(token.eoaBalance)
                            : formatUnits(token.eoaBalance, token.decimals)
                          : '0.00'}
                      </div>
                      <div className="text-xs text-blue-700">{token.symbol}</div>
                    </div>

                    <div className="border rounded-lg p-2 bg-green-50 border-green-200">
                      <div className="text-xs text-green-700 font-medium mb-0.5">Smart Account</div>
                      <div className="text-base font-bold text-green-900">
                        {token.delegatorBalance !== undefined
                          ? token.isNative
                            ? formatEther(token.delegatorBalance)
                            : formatUnits(token.delegatorBalance, token.decimals)
                          : '0.00'}
                      </div>
                      <div className="text-xs text-green-700">{token.symbol}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              No strategy assets found
            </div>
          )}
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

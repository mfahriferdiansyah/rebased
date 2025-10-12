import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStrategy } from '@/hooks/useStrategy';
import { delegationsApi } from '@/lib/api/delegations';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Info, Link2, AlertCircle, LogIn } from 'lucide-react';
import type { ApiStrategy } from '@/lib/types/api-strategy';
import type { Delegation } from '@/lib/types/delegation';

interface StrategySelectorProps {
  delegation: Delegation;
  chainId: number;
  onSuccess?: () => void;
}

export function StrategySelector({
  delegation,
  chainId,
  onSuccess,
}: StrategySelectorProps) {
  const { authenticated, ready, login } = usePrivy();
  const { getBackendToken, isBackendAuthenticated } = useAuth();
  const { wallets } = useWallets();
  const { strategies, loading, isReady } = useStrategy(chainId);

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = wallets[0];
  const userAddress = wallet?.address;

  // Filter strategies for the same chain as delegation (defensive: default to empty array)
  const matchingStrategies = (strategies || []).filter(s => s.chainId === chainId);

  // Pre-select current strategy if delegation already has one
  useEffect(() => {
    if (delegation.strategyId && !selectedStrategyId) {
      setSelectedStrategyId(delegation.strategyId);
    }
  }, [delegation.strategyId, selectedStrategyId]);

  const handleLink = async () => {
    if (!selectedStrategyId || !userAddress) return;

    setLinking(true);
    setError(null);

    try {
      // Use backend JWT token (not Privy token)
      const token = await getBackendToken();
      if (!token) {
        throw new Error('Unable to retrieve backend token. Please ensure you are authenticated.');
      }

      await delegationsApi.linkDelegationToStrategy(
        delegation.id,
        selectedStrategyId,
        token,
        userAddress
      );

      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to link delegation to strategy:', err);
      setError(err.message || 'Failed to link delegation to strategy');
    } finally {
      setLinking(false);
    }
  };

  // Authentication checks
  const isAuthReady = ready && authenticated;
  const shouldShowAuthMessage = ready && !authenticated;

  if (!ready) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
        <div className="text-xs text-gray-500 mt-2">Initializing...</div>
      </div>
    );
  }

  if (shouldShowAuthMessage) {
    return (
      <div className="text-center py-8">
        <LogIn className="w-10 h-10 text-blue-500 mx-auto mb-2" />
        <div className="text-sm text-gray-900 font-medium">Authentication Required</div>
        <div className="text-xs text-gray-500 mt-1 mb-3">
          Please log in to link strategies
        </div>
        <Button
          onClick={login}
          size="sm"
          className="bg-gray-900 hover:bg-gray-800"
        >
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-medium text-blue-900 text-sm">Link to Strategy</div>
            <div className="text-blue-700 text-xs leading-relaxed">
              Connect this delegation to one of your saved strategies. The bot will use this
              delegation when executing rebalances for the linked strategy.
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Selection */}
      <div>
        <Label htmlFor="strategy">Select Strategy</Label>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
            <span className="ml-2 text-sm text-gray-600">Loading strategies...</span>
          </div>
        ) : matchingStrategies.length === 0 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-2">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-orange-900 text-sm">No Strategies Found</div>
                <div className="text-orange-700 text-xs leading-relaxed">
                  You don't have any saved strategies for{' '}
                  {chainId === 10143 ? 'Monad Testnet' : 'Base Sepolia'}.
                  Create a strategy on the canvas and save it first.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Select
              value={selectedStrategyId}
              onValueChange={setSelectedStrategyId}
            >
              <SelectTrigger id="strategy" className="mt-2">
                <SelectValue placeholder="Choose a strategy..." />
              </SelectTrigger>
              <SelectContent>
                {matchingStrategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    <div className="flex items-center justify-between gap-4 min-w-[300px]">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          Strategy #{strategy.strategyId.toString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {strategy.tokens.length} asset
                          {strategy.tokens.length !== 1 ? 's' : ''} •{' '}
                          {strategy.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-gray-500 mt-1">
              {matchingStrategies.length} strateg{matchingStrategies.length !== 1 ? 'ies' : 'y'}{' '}
              available on {chainId === 10143 ? 'Monad Testnet' : 'Base Sepolia'}
            </div>
          </>
        )}
      </div>

      {/* Selected Strategy Details */}
      {selectedStrategyId && matchingStrategies.length > 0 && (
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-xs font-medium text-gray-700 mb-2">Strategy Details</div>
          {(() => {
            const selectedStrategy = matchingStrategies.find(s => s.id === selectedStrategyId);
            if (!selectedStrategy) return null;

            return (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Strategy ID:</span>
                  <span className="font-mono">{selectedStrategy.strategyId.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assets:</span>
                  <span>{selectedStrategy.tokens.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rebalance Interval:</span>
                  <span>
                    {Number(selectedStrategy.rebalanceInterval) / 3600}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span
                    className={
                      selectedStrategy.isActive ? 'text-green-600' : 'text-gray-600'
                    }
                  >
                    {selectedStrategy.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-900 text-sm">Error</div>
              <div className="text-red-700 text-xs">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Link Button */}
      <Button
        onClick={handleLink}
        disabled={!selectedStrategyId || linking || matchingStrategies.length === 0}
        className="w-full"
      >
        {linking ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Linking...
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4 mr-2" />
            {delegation.strategyId ? 'Update Link' : 'Link to Strategy'}
          </>
        )}
      </Button>

      {/* Already Linked Notice */}
      {delegation.strategyId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex gap-2">
            <Link2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-green-900 text-sm">Already Linked</div>
              <div className="text-green-700 text-xs">
                This delegation is currently linked to a strategy. You can update the link above.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

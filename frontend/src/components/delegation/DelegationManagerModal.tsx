import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Shield, BarChart3, Clock, AlertCircle, LogIn, Link2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useDelegation } from '@/hooks/useDelegation';
import { CreateDelegationForm } from './CreateDelegationForm';
import { StrategySelector } from '@/components/strategy/StrategySelector';
import type { Delegation } from '@/lib/types/delegation';

interface DelegationManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chainId?: number;
}

export function DelegationManagerModal({
  open,
  onOpenChange,
  chainId,
}: DelegationManagerModalProps) {
  const { authenticated, ready, login } = usePrivy();
  const {
    delegations,
    activeDelegation,
    stats,
    loading,
    isReady,
    selectDelegation,
    revokeDelegation,
    refreshDelegations,
  } = useDelegation(chainId);

  const [activeTab, setActiveTab] = useState('active');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [selectedDelegationForLinking, setSelectedDelegationForLinking] = useState<Delegation | null>(null);

  // Authentication checks
  const isAuthReady = ready && authenticated;
  const shouldShowAuthMessage = ready && !authenticated;

  const handleSelect = (delegation: Delegation) => {
    selectDelegation(delegation);
    onOpenChange(false);
  };

  const handleRevoke = async (delegationId: string) => {
    setRevoking(delegationId);
    try {
      await revokeDelegation(delegationId);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-700" />
            Delegation Manager
          </DialogTitle>
          <DialogDescription>
            Manage ERC-7710 delegations for automated strategy execution
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active">
              Active
              {delegations.length > 0 && (
                <Badge variant="outline" className="ml-2 bg-green-100 text-green-700 border-green-300">
                  {delegations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="link" disabled={!selectedDelegationForLinking}>
              Link Strategy
            </TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Active Delegations Tab */}
          <TabsContent value="active" className="space-y-3 mt-4">
            {!ready ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <div className="text-sm text-gray-500 mt-2">Initializing...</div>
              </div>
            ) : shouldShowAuthMessage ? (
              <div className="text-center py-12">
                <LogIn className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <div className="text-gray-900 font-medium">Authentication Required</div>
                <div className="text-sm text-gray-500 mt-1 mb-4">
                  Please log in to view your delegations
                </div>
                <Button
                  onClick={login}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  Log In
                </Button>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <div className="text-sm text-gray-500 mt-2">Loading delegations...</div>
              </div>
            ) : delegations.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-900 font-medium">No active delegations</div>
                <div className="text-sm text-gray-500 mt-1 mb-4">
                  Create a delegation to allow the bot to execute rebalances
                </div>
                <Button
                  onClick={() => setActiveTab('create')}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  Create Delegation
                </Button>
              </div>
            ) : (
              delegations.map(delegation => (
                <div
                  key={delegation.id}
                  className={`border rounded-lg p-4 transition-all ${
                    activeDelegation?.id === delegation.id
                      ? 'border-gray-900 bg-gray-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Delegation Info */}
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Delegate Address */}
                      <div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">
                          Delegate Address
                        </div>
                        <div className="text-sm font-mono text-gray-900">
                          {delegation.delegateAddress.slice(0, 10)}...
                          {delegation.delegateAddress.slice(-8)}
                        </div>
                      </div>

                      {/* Chain & Strategy */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {delegation.chainId === 10143 ? 'Monad Testnet' : 'Base Sepolia'}
                        </Badge>
                        {delegation.strategy && (
                          <div className="text-xs text-gray-600">
                            {delegation.strategy.tokens.length} asset
                            {delegation.strategy.tokens.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        Created {new Date(delegation.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2">
                      {activeDelegation?.id === delegation.id ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelect(delegation)}
                          className="whitespace-nowrap"
                        >
                          Select
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDelegationForLinking(delegation);
                          setActiveTab('link');
                        }}
                        className="whitespace-nowrap"
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        {delegation.strategyId ? 'Update Link' : 'Link'}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevoke(delegation.id)}
                        disabled={revoking === delegation.id}
                        className="whitespace-nowrap"
                      >
                        {revoking === delegation.id ? 'Revoking...' : 'Revoke'}
                      </Button>
                    </div>
                  </div>

                  {/* Strategy Details (if available) */}
                  {delegation.strategy && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1.5">
                        Strategy Details
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Strategy ID:</span>
                          <span className="ml-1 font-mono">{delegation.strategy.strategyId}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className="ml-1">
                            {delegation.strategy.isActive ? (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-300">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-700">
                                Inactive
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Create New Tab */}
          <TabsContent value="create" className="mt-4">
            {!ready ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <div className="text-sm text-gray-500 mt-2">Initializing...</div>
              </div>
            ) : shouldShowAuthMessage ? (
              <div className="text-center py-12">
                <LogIn className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <div className="text-gray-900 font-medium">Authentication Required</div>
                <div className="text-sm text-gray-500 mt-1 mb-4">
                  Please log in to create delegations
                </div>
                <Button
                  onClick={login}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  Log In
                </Button>
              </div>
            ) : (
              <CreateDelegationForm
                chainId={chainId}
                onSuccess={() => {
                  setActiveTab('active');
                  refreshDelegations();
                }}
              />
            )}
          </TabsContent>

          {/* Link Strategy Tab */}
          <TabsContent value="link" className="mt-4">
            {!ready ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <div className="text-sm text-gray-500 mt-2">Initializing...</div>
              </div>
            ) : shouldShowAuthMessage ? (
              <div className="text-center py-12">
                <LogIn className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <div className="text-gray-900 font-medium">Authentication Required</div>
                <div className="text-sm text-gray-500 mt-1 mb-4">
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
            ) : selectedDelegationForLinking ? (
              <StrategySelector
                delegation={selectedDelegationForLinking}
                chainId={selectedDelegationForLinking.chainId}
                onSuccess={() => {
                  setActiveTab('active');
                  setSelectedDelegationForLinking(null);
                  refreshDelegations();
                }}
              />
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-900 font-medium">No Delegation Selected</div>
                <div className="text-sm text-gray-500 mt-1 mb-4">
                  Select a delegation from the Active tab to link it to a strategy
                </div>
                <Button
                  onClick={() => setActiveTab('active')}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  View Delegations
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            {!ready ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <div className="text-sm text-gray-500 mt-2">Initializing...</div>
              </div>
            ) : shouldShowAuthMessage ? (
              <div className="text-center py-12">
                <LogIn className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <div className="text-gray-900 font-medium">Authentication Required</div>
                <div className="text-sm text-gray-500 mt-1 mb-4">
                  Please log in to view statistics
                </div>
                <Button
                  onClick={login}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  Log In
                </Button>
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <BarChart3 className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.totalDelegations}</div>
                    <div className="text-sm text-gray-600 mt-0.5">Total Delegations</div>
                  </div>

                  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {stats.activeDelegations}
                    </div>
                    <div className="text-sm text-green-600 mt-0.5">Active</div>
                  </div>

                  <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-2xl font-bold text-red-700">
                      {stats.revokedDelegations}
                    </div>
                    <div className="text-sm text-red-600 mt-0.5">Revoked</div>
                  </div>

                  <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {Object.keys(stats.chainBreakdown).length}
                    </div>
                    <div className="text-sm text-blue-600 mt-0.5">Chains</div>
                  </div>
                </div>

                {/* Chain Breakdown */}
                {Object.keys(stats.chainBreakdown).length > 0 && (
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900 mb-3">
                      Chain Breakdown
                    </div>
                    <div className="space-y-2">
                      {Object.entries(stats.chainBreakdown).map(([chainId, count]) => (
                        <div key={chainId} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {chainId === '10143' ? 'Monad Testnet' : 'Base Sepolia'}
                          </span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <div className="text-sm text-gray-500 mt-2">Loading stats...</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

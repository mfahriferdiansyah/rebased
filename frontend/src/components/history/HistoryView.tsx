import React, { useState } from 'react';
import { useRebalances } from '@/hooks/useRebalances';
import { Rebalance, RebalanceStatus } from '@/lib/types/rebalance';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink, Zap, DollarSign, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { formatEther } from 'viem';
import { getChainById, getNativeCurrencySymbol } from '@/lib/chains';

export function HistoryView() {
  const { rebalances, stats, loading, loadingStats, total, refreshRebalances, refreshStats } = useRebalances({ limit: 50 });
  const [selectedRebalance, setSelectedRebalance] = useState<Rebalance | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Format date relative to now
  const formatDate = (dateString: string) => {
    try {
      return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  // Format gas cost to ETH
  const formatGasCost = (gasCost: string) => {
    try {
      return parseFloat(formatEther(BigInt(gasCost))).toFixed(6);
    } catch {
      return '0';
    }
  };

  // Get status config
  const getStatusConfig = (status: RebalanceStatus) => {
    switch (status) {
      case RebalanceStatus.SUCCESS:
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Success',
        };
      case RebalanceStatus.FAILED:
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Failed',
        };
      case RebalanceStatus.PENDING:
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Pending',
        };
      default:
        return {
          icon: XCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Reverted',
        };
    }
  };

  // Get explorer URL
  const getExplorerUrl = (chainId: number, txHash: string): string => {
    const chain = getChainById(chainId);
    const explorerUrl = chain?.blockExplorers?.default?.url || '';
    return `${explorerUrl}/tx/${txHash}`;
  };

  // Handle error click
  const handleErrorClick = (error: string) => {
    setSelectedError(error);
    setErrorDialogOpen(true);
  };

  // Truncate error message
  const truncateError = (error: string, maxLength: number = 60) => {
    if (error.length <= maxLength) return error;
    return error.slice(0, maxLength) + '...';
  };

  // Handle refresh with minimum delay for smooth UX
  const handleRefresh = async () => {
    setIsRefreshing(true);

    const startTime = Date.now();
    const minDelay = 600; // Minimum 600ms for smooth animation

    try {
      await Promise.all([
        refreshRebalances({ limit: 50 }),
        refreshStats(),
      ]);

      // Ensure minimum delay for smooth transition
      const elapsed = Date.now() - startTime;
      if (elapsed < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state
  if (loading && rebalances.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
          <p className="text-sm text-gray-500">Loading rebalance history...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (rebalances.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">No Rebalances Yet</h4>
            <p className="text-sm text-gray-600 mt-1">
              Your rebalance history will appear here once the bot starts executing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
      {/* Title with Refresh Icon */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold text-gray-900">
          Rebalance History
          <span className="text-sm font-normal text-gray-600 ml-2">({total} total)</span>
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isRefreshing ? 'Refreshing...' : 'Refresh data'}
          aria-label="Refresh rebalance history"
        >
          <RefreshCw className={`w-5 h-5 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading State */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500">Refreshing data...</p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {!isRefreshing && stats && !loadingStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
              <Activity className="w-3.5 h-3.5" />
              Total
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 text-xs mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Success
            </div>
            <div className="text-2xl font-bold text-green-900">{stats.successful}</div>
            <div className="text-xs text-green-700">{stats.successRate.toFixed(1)}% rate</div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 text-xs mb-1">
              <XCircle className="w-3.5 h-3.5" />
              Error Count
            </div>
            <div className="text-2xl font-bold text-red-900">
              {stats.total - stats.successful}
            </div>
            <div className="text-xs text-red-700">failed rebalances</div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Total Gas
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {formatGasCost(stats.totalGasCost)}
            </div>
            <div className="text-xs text-purple-700">
              {rebalances.length > 0 ? getNativeCurrencySymbol(rebalances[0].chainId) : 'MON'}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!isRefreshing && (
        <div className="animate-fadeIn">
          <div className="space-y-3">
          {rebalances.map((rebalance, index) => {
            const statusConfig = getStatusConfig(rebalance.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={rebalance.id}
                className="border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 overflow-hidden"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`rounded-full ${statusConfig.bgColor} p-2 flex-shrink-0`}>
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900">
                            {rebalance.strategyName || 'Strategy Rebalance'}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {formatDate(rebalance.executedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Chain badge */}
                    <div className="text-xs text-gray-600 flex items-center gap-1 whitespace-nowrap">
                      Chain: {rebalance.chainId}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-gray-50 rounded p-2 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-0.5">Drift Before</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {(parseInt(rebalance.drift) / 100).toFixed(2)}%
                      </div>
                    </div>

                    {rebalance.driftAfter && (
                      <div className="bg-gray-50 rounded p-2 border border-gray-200">
                        <div className="text-xs text-gray-700 mb-0.5">Drift After</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {(parseInt(rebalance.driftAfter) / 100).toFixed(2)}%
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded p-2 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-0.5">Swaps</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {rebalance.swapsExecuted}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-2 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-0.5">Gas Cost</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatGasCost(rebalance.gasCost)} {getNativeCurrencySymbol(rebalance.chainId)}
                      </div>
                    </div>
                  </div>

                  {/* Error Message - Truncated and Clickable */}
                  {rebalance.errorMessage && (
                    <div
                      className="bg-red-50 border border-red-200 rounded p-2 mb-3 cursor-pointer hover:bg-red-100 transition-colors"
                      onClick={() => handleErrorClick(rebalance.errorMessage || '')}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-800 flex-1">
                          <strong>Error:</strong> {truncateError(rebalance.errorMessage)}
                        </p>
                        {rebalance.errorMessage.length > 60 && (
                          <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                            Click to view
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transaction Link */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-gray-600">
                      Tx: <span className="font-mono">{rebalance.txHash.slice(0, 10)}...{rebalance.txHash.slice(-8)}</span>
                    </div>
                    <a
                      href={getExplorerUrl(rebalance.chainId, rebalance.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* Load More (Future enhancement) */}
      {!isRefreshing && total > rebalances.length && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">
            Showing {rebalances.length} of {total} rebalances
          </p>
        </div>
      )}

      {/* Error Dialog Modal */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Error Details
            </DialogTitle>
            <DialogDescription>
              Full error message from the rebalance transaction
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <pre className="text-xs text-red-800 whitespace-pre-wrap break-words font-mono">
                {selectedError}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

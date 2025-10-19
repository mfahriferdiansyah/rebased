import React, { useState } from "react";
import { StrategyWithMetrics, statusConfig } from "@/lib/utils/mockStrategies";
import { CanvasPreview } from "@/components/preview/CanvasPreview";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp, TrendingDown, ChevronDown, ChevronUp, FileEdit, Pause, Activity, Play, Trash2 } from "lucide-react";
import { BlockType } from "@/lib/types/blocks";

interface PlanCardProps {
  strategy: StrategyWithMetrics;
  onDeploy: (strategy: StrategyWithMetrics) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PlanCard({ strategy, onDeploy, onStart, onStop, onDelete }: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isProfitable = strategy.metrics.pnl >= 0;
  const assets = strategy.blocks.filter((b) => b.type === BlockType.ASSET);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPnl = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Asset summary
  const assetSummary = assets.map((a) => a.data.symbol).join(", ");

  // Get status configuration
  const config = statusConfig[strategy.status];

  // Render status icon and label
  const renderStatusIcon = () => {
    const IconMap = {
      draft: FileEdit,
      paused: Pause,
      active: Activity,
    };
    const IconComponent = IconMap[config.icon as keyof typeof IconMap];

    return (
      <div className="flex flex-col items-center gap-1 w-16">
        <IconComponent className="w-4 h-4 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">{config.label}</span>
      </div>
    );
  };

  // Check if can start (draft or stopped)
  const canStart = strategy.status === "draft" || strategy.status === "stopped";
  // Check if can stop (running)
  const canStop = strategy.status === "running";

  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden hover:border-gray-400 transition-all duration-200">
      {/* Collapsed Row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors duration-200"
      >
        {/* Status - Fixed width */}
        <div className="flex-shrink-0 w-16 flex items-center justify-center">
          {renderStatusIcon()}
        </div>

        {/* Divider */}
        <div className="h-12 w-px bg-gray-300 flex-shrink-0" />

        {/* Title and Description - Flex grow */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="font-bold text-gray-900 truncate">{strategy.name}</h4>
          <p className="text-xs text-gray-600 truncate">{strategy.description}</p>
        </div>

        {/* Metrics - Fixed width */}
        <div className="flex-shrink-0 w-40 flex flex-col items-end justify-center gap-0.5">
          <div className="flex items-center gap-1">
            {isProfitable ? (
              <TrendingUp className="w-4 h-4 text-gray-700" />
            ) : (
              <TrendingDown className="w-4 h-4 text-gray-500" />
            )}
            <span className={`text-sm font-semibold ${isProfitable ? "text-gray-900" : "text-gray-600"}`}>
              {formatPnl(strategy.metrics.pnl)}
            </span>
          </div>
          <div className="text-sm font-bold text-gray-900">
            {formatCurrency(strategy.metrics.totalValuation)}
          </div>
        </div>

        {/* Assets - Fixed width */}
        <div className="flex-shrink-0 w-48 text-xs text-gray-600 truncate">
          {assets.length} assets: {assetSummary}
        </div>

        {/* Expand Icon - Fixed width */}
        <div className="flex-shrink-0 w-4 flex items-center justify-center">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-700" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-700" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-300 bg-gray-50 max-h-[400px] overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Canvas Preview */}
            <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
              <div className="h-64">
                <CanvasPreview
                  blocks={strategy.blocks}
                  connections={strategy.connections}
                  startBlockPos={strategy.startBlockPosition}
                  endBlockPos={strategy.endBlockPosition}
                />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
            {/* Left: Assets */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-700">Asset Allocation</div>

              {/* Horizontal Bar */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                {assets.map((asset, index) => (
                  <div
                    key={asset.id}
                    className="bg-gray-700"
                    style={{
                      width: `${asset.data.initialWeight}%`,
                      backgroundColor: `hsl(0, 0%, ${30 + index * 15}%)`,
                    }}
                  />
                ))}
              </div>

              {/* Asset List */}
              <div className="flex flex-wrap gap-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-gray-300 text-xs"
                  >
                    <span>{asset.data.icon}</span>
                    <span className="font-semibold text-gray-900">{asset.data.symbol}</span>
                    <span className="text-gray-600">{asset.data.initialWeight}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Details + Actions */}
            <div className="space-y-3">
              {/* Top row: Dates + Delete */}
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">
                    Created: {formatDate(strategy.metadata.createdAt)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Updated: {formatDate(strategy.metadata.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(strategy.id);
                  }}
                  className="px-3 py-1.5 rounded text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              {/* Bottom row: View + Start/Stop */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeploy(strategy);
                  }}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View in Canvas
                </button>

                {canStart && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart(strategy.id);
                    }}
                    className="flex-1 px-3 py-1.5 rounded text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </button>
                )}

                {canStop && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStop(strategy.id);
                    }}
                    className="flex-1 px-3 py-1.5 rounded text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

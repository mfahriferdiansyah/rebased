import React from "react";
import { ActionBlock as ActionBlockType, Block, BlockType, AssetBlock } from "@/lib/types/blocks";
import { Zap, Trash2, Clock, TrendingUp, ArrowRight, Send, AlertCircle } from "lucide-react";
import { TokenIcon } from "@/components/ui/token-icon";

interface ActionBlockProps {
  block: ActionBlockType;
  blocks: Block[]; // All blocks to look up connected assets
  zoom: number;
  isSelected?: boolean;
  isInConnectionMode?: boolean;
  isDimmed?: boolean;
  connectionModeActive?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDelete?: () => void;
  onEdit?: (block: ActionBlockType) => void;
  dragOffset?: { x: number; y: number };
}

export function ActionBlock({
  block,
  blocks,
  zoom,
  isSelected = false,
  isInConnectionMode = false,
  isDimmed = false,
  connectionModeActive = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  onEdit,
  dragOffset
}: ActionBlockProps) {
  const { actionType, rebalanceTrigger, swapFrom, swapTo, swapAmount, transferAsset, transferTo, transferAmount } = block.data;

  // Get connected asset blocks (for rebalance action)
  const connectedAssets = React.useMemo(() => {
    return block.connections.inputs
      .map(inputId => blocks.find(b => b.id === inputId))
      .filter((b): b is AssetBlock => b?.type === BlockType.ASSET);
  }, [block.connections.inputs, blocks]);

  // Get total asset blocks in the strategy (for rebalance validation)
  const totalAssets = React.useMemo(() => {
    return blocks.filter(b => b.type === BlockType.ASSET);
  }, [blocks]);

  // Check if all assets are connected (for rebalance)
  const allAssetsConnected = actionType === "rebalance"
    ? connectedAssets.length === totalAssets.length && totalAssets.length > 0
    : true;

  const actualX = block.position.x + (dragOffset?.x || 0);
  const actualY = block.position.y + (dragOffset?.y || 0);

  const style = {
    top: 0,
    left: 0,
    transform: `translate(${actualX}px, ${actualY}px)`,
    width: block.size.width,
    minHeight: block.size.height,
  };

  return (
    <div
      className={`
        absolute bg-white rounded-lg p-4
        border border-gray-300
        transition-shadow duration-200 transition-colors duration-200
        ${isSelected ? "ring-2 ring-gray-900 shadow-md" : "shadow-sm"}
        ${isInConnectionMode ? "ring-2 ring-blue-400" : ""}
        ${isDimmed ? "opacity-35 grayscale-[50%] cursor-not-allowed" : connectionModeActive ? "cursor-pointer" : "cursor-move"}
        hover:shadow-md hover:border-gray-400
      `}
      style={style}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit?.(block);
      }}
    >
      {/* Delete button - only visible when selected */}
      {isSelected && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors duration-200 shadow-md z-10"
          title="Delete block"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
          <Zap className="w-4 h-4 text-gray-700" />
        </div>
        <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">Action</span>
      </div>

      {/* Action type badge */}
      <div className="text-center mb-3">
        <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 font-medium text-xs uppercase tracking-wide rounded border border-gray-200">
          {actionType}
        </div>
      </div>

      {/* REBALANCE Content */}
      {actionType === "rebalance" && rebalanceTrigger && (
        <div className={`bg-gray-50 rounded p-2 border ${
          !allAssetsConnected
            ? "border-orange-500 bg-orange-100"
            : "border-gray-200"
        }`}>
          {/* Warning badge when not all assets connected */}
          {!allAssetsConnected && (
            <div className="flex items-center justify-center gap-1 mb-1.5 text-orange-700">
              <AlertCircle className="w-3 h-3" />
              <span className="text-[10px] font-medium">
                {connectedAssets.length}/{totalAssets.length} assets
              </span>
            </div>
          )}

          {/* Connected asset icons */}
          {connectedAssets.length > 0 && (
            <div className="flex items-center justify-center gap-1 mb-1.5 flex-wrap">
              {connectedAssets.slice(0, 5).map((asset) => (
                <TokenIcon
                  key={asset.id}
                  address={asset.data.address}
                  chainId={asset.data.chainId}
                  symbol={asset.data.symbol}
                  logoUri={asset.data.logoUri}
                  size={18}
                  showChainBadge={false}
                />
              ))}
              {connectedAssets.length > 5 && (
                <div className="w-[18px] h-[18px] rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-gray-600">+{connectedAssets.length - 5}</span>
                </div>
              )}
            </div>
          )}

          {/* Trigger info - 2 line layout */}
          <div className="space-y-0.5 text-center">
            {/* Line 1: Interval */}
            <div className="flex items-center justify-center gap-1 text-xs text-gray-900">
              <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
              <span className="font-medium">Every {rebalanceTrigger.interval} min</span>
            </div>

            {/* Line 2: Drift condition (if present) */}
            {rebalanceTrigger.drift && (
              <div className="flex items-center justify-center gap-1 text-xs text-gray-900">
                <span className="text-gray-500">if</span>
                <TrendingUp className="w-3 h-3 text-gray-600 flex-shrink-0" />
                <span className="font-medium">drift &gt; {rebalanceTrigger.drift}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SWAP Content */}
      {actionType === "swap" && swapFrom && swapTo && (
        <div className="bg-gray-50 rounded p-2 border border-gray-200">
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap flex-shrink-0">
              {swapAmount || '?'}
            </span>
            <div className="flex-shrink-0">
              <TokenIcon
                address={swapFrom.address}
                chainId={swapFrom.chainId}
                symbol={swapFrom.symbol}
                logoUri={swapFrom.logoUri}
                size={16}
                showChainBadge={false}
              />
            </div>
            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap flex-shrink-0">
              {swapFrom.symbol}
            </span>
            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0 mx-0.5" />
            <div className="flex-shrink-0">
              <TokenIcon
                address={swapTo.address}
                chainId={swapTo.chainId}
                symbol={swapTo.symbol}
                logoUri={swapTo.logoUri}
                size={16}
                showChainBadge={false}
              />
            </div>
            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap flex-shrink-0">{swapTo.symbol}</span>
          </div>
        </div>
      )}

      {/* TRANSFER Content */}
      {actionType === "transfer" && transferAsset && transferTo && (
        <div className="bg-gray-50 rounded p-2 border border-gray-200 space-y-1">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <TokenIcon
              address={transferAsset.address}
              chainId={transferAsset.chainId}
              symbol={transferAsset.symbol}
              logoUri={transferAsset.logoUri}
              size={18}
              showChainBadge={false}
            />
            <span className="text-xs font-semibold text-gray-900">
              {transferAmount || '?'} {transferAsset.symbol}
            </span>
            <Send className="w-3 h-3 text-gray-400 flex-shrink-0" />
          </div>
          <div className="text-center text-[10px] font-mono text-gray-600 truncate">
            {transferTo.slice(0, 8)}...{transferTo.slice(-6)}
          </div>
        </div>
      )}
    </div>
  );
}

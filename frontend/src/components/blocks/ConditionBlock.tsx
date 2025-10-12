import React from "react";
import { ConditionBlock as ConditionBlockType, Block, BlockType, AssetBlock } from "@/lib/types/blocks";
import { GitBranch, Trash2 } from "lucide-react";
import { TokenIcon } from "@/components/ui/token-icon";

interface ConditionBlockProps {
  block: ConditionBlockType;
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
  onEdit?: (block: ConditionBlockType) => void;
  dragOffset?: { x: number; y: number };
}

export function ConditionBlock({
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
}: ConditionBlockProps) {
  const { conditionType, operator, valueUSD } = block.data;

  // Get connected asset blocks
  const connectedAssets = React.useMemo(() => {
    return block.connections.inputs
      .map(inputId => blocks.find(b => b.id === inputId))
      .filter((b): b is AssetBlock => b?.type === BlockType.ASSET);
  }, [block.connections.inputs, blocks]);

  const operatorSymbol = operator === "GT" ? ">" : "<";

  const actualX = block.position.x + (dragOffset?.x || 0);
  const actualY = block.position.y + (dragOffset?.y || 0);

  const style = {
    top: 0,
    left: 0,
    transform: `translate(${actualX}px, ${actualY}px)`,
    width: block.size.width,
    minHeight: block.size.height,
  };

  // Get label text based on condition type (no asset name displayed)
  const getLabel = () => {
    if (conditionType === "price") return "Price";
    if (conditionType === "portfolioValue") return "Portfolio";
    if (conditionType === "assetValue") return "Value";
    return "Condition";
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
          <GitBranch className="w-4 h-4 text-gray-700" />
        </div>
        <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">Condition</span>
      </div>

      {/* Condition display */}
      <div className="bg-gray-50 rounded p-2.5 border border-gray-200 text-center">
        {/* Connected asset icons */}
        {connectedAssets.length > 0 ? (
          <div className="flex items-center justify-center gap-1 mb-1.5 flex-wrap">
            {connectedAssets.slice(0, 5).map((asset) => (
              <TokenIcon
                key={asset.id}
                address={asset.data.address}
                chainId={asset.data.chainId}
                symbol={asset.data.symbol}
                logoUri={asset.data.logoUri}
                size={20}
                showChainBadge={false}
              />
            ))}
            {connectedAssets.length > 5 && (
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-[10px] font-bold text-gray-600">+{connectedAssets.length - 5}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 mb-1.5">No assets</div>
        )}

        <div className="text-xs font-medium text-gray-600 mb-1">
          {getLabel()}
        </div>

        <div className="flex items-center justify-center gap-1.5">
          <div className="text-xl font-bold text-gray-900">
            {operatorSymbol}
          </div>
          <div className="text-sm font-bold text-gray-800 truncate px-1 max-w-[100px]">
            ${valueUSD.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

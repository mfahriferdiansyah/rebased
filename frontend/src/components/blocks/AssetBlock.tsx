import React from "react";
import { AssetBlock as AssetBlockType } from "@/lib/types/blocks";
import { Wallet, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TokenIcon } from "@/components/ui/token-icon";
import { getChainLogoUrl } from "@/lib/utils/token-logo";

interface AssetBlockProps {
  block: AssetBlockType;
  zoom: number;
  isSelected?: boolean;
  isInConnectionMode?: boolean;
  isDimmed?: boolean;
  connectionModeActive?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDelete?: () => void;
  onEdit?: (block: AssetBlockType) => void;
  dragOffset?: { x: number; y: number };
}

export function AssetBlock({
  block,
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
}: AssetBlockProps) {
  const actualX = block.position.x + (dragOffset?.x || 0);
  const actualY = block.position.y + (dragOffset?.y || 0);

  const style = {
    top: 0,
    left: 0,
    transform: `translate(${actualX}px, ${actualY}px)`,
    width: block.size.width,
    height: block.size.height,
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

      {/* Chain Badge - using actual logo, NO colors */}
      <Badge
        variant="outline"
        className="absolute top-2 right-2 text-xs border-gray-200 bg-white text-gray-900"
      >
        <img
          src={getChainLogoUrl(block.data.chainId)}
          alt={block.data.chainId === 10143 ? 'Monad' : 'Base'}
          className="w-3 h-3 rounded-full mr-1.5"
        />
        {block.data.chainId === 10143 ? 'Monad' : 'Base'}
      </Badge>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {/* Token Logo */}
        <TokenIcon
          address={block.data.address}
          chainId={block.data.chainId}
          symbol={block.data.symbol}
          logoUri={block.data.logoUri}
          size={28}
          showChainBadge={false}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate">{block.data.symbol}</div>
          <div className="text-xs text-gray-500 truncate">{block.data.name}</div>
        </div>
      </div>

      {/* Weight */}
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {block.data.initialWeight}%
        </div>
        <div className="text-xs font-medium text-gray-500">Weight</div>
      </div>

    </div>
  );
}

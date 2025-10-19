import React from "react";
import { CheckCircle2 } from "lucide-react";

interface EndBlockProps {
  position: { x: number; y: number };
  size: { width: number; height: number };
  zoom: number;
  isSelected?: boolean;
  isInConnectionMode?: boolean;
  isDimmed?: boolean;
  connectionModeActive?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  dragOffset?: { x: number; y: number };
}

export function EndBlock({
  position,
  size,
  zoom,
  isSelected = false,
  isInConnectionMode = false,
  isDimmed = false,
  connectionModeActive = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  dragOffset
}: EndBlockProps) {
  const actualX = position.x + (dragOffset?.x || 0);
  const actualY = position.y + (dragOffset?.y || 0);

  const style = {
    top: 0,
    left: 0,
    transform: `translate(${actualX}px, ${actualY}px)`,
    width: size.width,
    height: size.height,
  };

  return (
    <div
      className={`
        absolute bg-white rounded-lg p-4
        border-2 border-gray-400
        transition-shadow duration-200
        ${isSelected ? "ring-2 ring-gray-900 shadow-lg" : "shadow-md"}
        ${isInConnectionMode ? "ring-2 ring-blue-400" : ""}
        ${isDimmed ? "opacity-35 grayscale-[50%] cursor-not-allowed" : connectionModeActive ? "cursor-pointer" : "cursor-move"}
      `}
      style={style}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm text-gray-900">END</div>
          <div className="text-xs text-gray-500">Rebalance Result</div>
        </div>
      </div>

      {/* Info */}
      <div className="text-center py-2 px-3 bg-gray-50 rounded border border-gray-200">
        <div className="text-xs font-medium text-gray-700 truncate">
          Final Portfolio State
        </div>
      </div>
    </div>
  );
}

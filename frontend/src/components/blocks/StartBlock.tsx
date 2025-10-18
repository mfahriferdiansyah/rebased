import React from "react";
import { Play, Shield, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Delegation } from "@/lib/types/delegation";

interface StartBlockProps {
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

  // Delegation props
  activeDelegation?: Delegation | null;
  onDelegationClick?: () => void;
}

export function StartBlock({
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
  dragOffset,
  activeDelegation,
  onDelegationClick,
}: StartBlockProps) {
  const actualX = position.x + (dragOffset?.x || 0);
  const actualY = position.y + (dragOffset?.y || 0);

  const style = {
    top: 0,
    left: 0,
    transform: `translate(${actualX}px, ${actualY}px)`,
    width: size.width,
    minHeight: size.height,
  };

  const hasDelegation = !!activeDelegation;

  return (
    <div
      className={`
        absolute bg-white rounded-lg p-4
        border-2 border-gray-400
        overflow-hidden
        transition-shadow duration-200 transition-colors duration-200
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
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-gray-900">START</div>
          <div className="text-xs text-gray-500">Initial Assets</div>
        </div>
      </div>

      {/* Delegation Status */}
      <div
        className={`rounded p-2 border cursor-pointer transition-colors ${
          hasDelegation
            ? "bg-green-50 border-green-200 hover:bg-green-100"
            : "bg-orange-50 border-orange-200 hover:bg-orange-100"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onDelegationClick?.();
        }}
      >
        <div className="flex items-center gap-1.5">
          {hasDelegation ? (
            <>
              <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-green-900 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <span className="truncate">Active</span>
                </div>
                <div className="text-[9px] font-mono text-green-700 truncate">
                  {activeDelegation.delegateAddress.slice(0, 6)}...
                  {activeDelegation.delegateAddress.slice(-4)}
                </div>
              </div>
              {/* Chain Badge - inline */}
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                {activeDelegation.chainId === 10143 ? 'Monad' : 'Base'}
              </Badge>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-orange-900 truncate">
                  No Delegation
                </div>
                <div className="text-[9px] text-orange-700">Click to setup</div>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

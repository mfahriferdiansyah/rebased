import React from "react";
import { TriggerBlock as TriggerBlockType } from "@/lib/types/blocks";
import { Clock, Trash2 } from "lucide-react";

interface TriggerBlockProps {
  block: TriggerBlockType;
  zoom: number;
  isSelected?: boolean;
  isInConnectionMode?: boolean;
  isDimmed?: boolean;
  connectionModeActive?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDelete?: () => void;
  dragOffset?: { x: number; y: number };
}

export function TriggerBlock({
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
  dragOffset
}: TriggerBlockProps) {
  const { triggerType, config } = block.data;

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
          <Clock className="w-4 h-4 text-gray-700" />
        </div>
        <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">Trigger</span>
      </div>

      {/* Trigger type */}
      <div className="text-center">
        <div className="
          inline-block px-3 py-1.5
          bg-gray-100
          text-gray-700 font-medium text-xs uppercase tracking-wide
          rounded
          border border-gray-200
          mb-2
        ">
          {triggerType}
        </div>

        {triggerType === "interval" && config.interval && (
          <div className="text-xs font-medium text-gray-600">
            Every {config.interval}s
          </div>
        )}

        {triggerType === "drift" && config.driftThreshold && (
          <div className="text-xs font-medium text-gray-600">
            {config.driftThreshold}% drift
          </div>
        )}

        {triggerType === "condition" && config.conditions && (
          <div className="text-xs font-medium text-gray-600">
            {config.conditions.length} condition{config.conditions.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

    </div>
  );
}

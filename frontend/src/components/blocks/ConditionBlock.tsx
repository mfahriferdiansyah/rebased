import React from "react";
import { ConditionBlock as ConditionBlockType } from "@/lib/types/blocks";
import { GitBranch, Trash2 } from "lucide-react";

interface ConditionBlockProps {
  block: ConditionBlockType;
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

export function ConditionBlock({
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
}: ConditionBlockProps) {
  const { operator, leftOperand, rightOperand, description } = block.data;

  const operatorSymbol = {
    GT: ">",
    LT: "<",
    GTE: "≥",
    LTE: "≤",
    EQ: "=",
  }[operator];

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
          <GitBranch className="w-4 h-4 text-gray-700" />
        </div>
        <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">Condition</span>
      </div>

      {/* Condition display */}
      <div className="bg-gray-50 rounded p-3 text-center border border-gray-200">
        <div className="text-xs font-medium text-gray-600">
          {leftOperand.type === "price" && `${leftOperand.asset} Price`}
          {leftOperand.type === "allocation" && `${leftOperand.asset} %`}
        </div>
        <div className="text-2xl font-bold text-gray-900 my-1">
          {operatorSymbol}
        </div>
        <div className="text-base font-bold text-gray-800">
          {rightOperand.type === "value" && `$${rightOperand.value}`}
          {rightOperand.type === "percentage" && `${rightOperand.value}%`}
        </div>
      </div>

      {description && (
        <div className="mt-2 text-xs text-gray-600 truncate">{description}</div>
      )}

    </div>
  );
}

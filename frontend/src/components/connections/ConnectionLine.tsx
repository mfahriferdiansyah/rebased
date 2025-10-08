import React from "react";
import { Connection } from "@/lib/types/strategy";
import { Block } from "@/lib/types/blocks";

interface ConnectionLineProps {
  connection: Connection;
  blocks: Block[];
  zoom: number;
  startBlock?: { id: string; position: { x: number; y: number }; size: { width: number; height: number } };
  endBlock?: { id: string; position: { x: number; y: number }; size: { width: number; height: number } };
  onDelete?: (connectionId: string) => void;
  dragTransform?: { blockId: string; offset: { x: number; y: number } } | null;
}

export function ConnectionLine({
  connection,
  blocks,
  zoom,
  startBlock,
  endBlock,
  onDelete,
  dragTransform,
}: ConnectionLineProps) {
  // Find source block (could be START, regular block)
  let sourceBlock;
  if (connection.source.blockId === "start-block" && startBlock) {
    sourceBlock = startBlock;
  } else {
    sourceBlock = blocks.find((b) => b.id === connection.source.blockId);
  }

  // Find target block (could be END, regular block)
  let targetBlock;
  if (connection.target.blockId === "end-block" && endBlock) {
    targetBlock = endBlock;
  } else {
    targetBlock = blocks.find((b) => b.id === connection.target.blockId);
  }

  if (!sourceBlock || !targetBlock) return null;

  // Calculate base connection points
  let sourcePoint = {
    x: sourceBlock.position.x + sourceBlock.size.width,
    y: sourceBlock.position.y + sourceBlock.size.height / 2,
  };

  let targetPoint = {
    x: targetBlock.position.x,
    y: targetBlock.position.y + targetBlock.size.height / 2,
  };

  // Apply drag offset if source block is being dragged
  if (dragTransform && dragTransform.blockId === connection.source.blockId) {
    sourcePoint = {
      x: sourcePoint.x + dragTransform.offset.x,
      y: sourcePoint.y + dragTransform.offset.y,
    };
  }

  // Apply drag offset if target block is being dragged
  if (dragTransform && dragTransform.blockId === connection.target.blockId) {
    targetPoint = {
      x: targetPoint.x + dragTransform.offset.x,
      y: targetPoint.y + dragTransform.offset.y,
    };
  }

  // Create curved path
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  const path = `
    M ${sourcePoint.x} ${sourcePoint.y}
    C ${midX} ${sourcePoint.y},
      ${midX} ${targetPoint.y},
      ${targetPoint.x} ${targetPoint.y}
  `;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(connection.id);
    }
  };

  // Black scissors cursor - rotated to face straight up
  const scissorsCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='%23000000'><g transform='rotate(-90 12 12)'><path d='M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z'/></g></svg>") 10 10, crosshair`;

  return (
    <g className="group" onClick={handleClick} style={{ pointerEvents: 'auto', cursor: scissorsCursor }}>
      {/* Invisible thick line for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12 / zoom}
        strokeLinecap="round"
        style={{ pointerEvents: 'stroke' }}
      />
      {/* Visible connection line - clean gray, red on hover */}
      <path
        d={path}
        fill="none"
        stroke="#9CA3AF"
        strokeWidth={2.5 / zoom}
        strokeLinecap="round"
        className="group-hover:stroke-red-500"
        style={{
          pointerEvents: 'none',
          transition: 'stroke 200ms'
        }}
      />
      {/* Arrow head - red on hover */}
      <polygon
        points="0,-4 8,0 0,4"
        fill="#6B7280"
        transform={`translate(${targetPoint.x - 8}, ${targetPoint.y})`}
        className="group-hover:fill-red-500"
        style={{
          pointerEvents: 'none',
          transition: 'fill 200ms'
        }}
      />
    </g>
  );
}

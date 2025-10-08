import React, { useMemo, useCallback } from "react";
import { Block } from "@/lib/types/blocks";
import { Connection } from "@/lib/types/strategy";
import { getCompatibleTargets, getCompatibleSources, getOutputPortPosition, getInputPortPosition } from "@/lib/utils/connectionValidation";

interface PortHighlightsProps {
  selectedBlockId: string | null;
  blocks: Block[];
  connections: Connection[];
  startBlock: { id: string; position: { x: number; y: number }; size: { width: number; height: number } };
  endBlock: { id: string; position: { x: number; y: number }; size: { width: number; height: number } };
  dragTransform?: { blockId: string; offset: { x: number; y: number } } | null;
}

export function PortHighlights({
  selectedBlockId,
  blocks,
  connections,
  startBlock,
  endBlock,
  dragTransform,
}: PortHighlightsProps) {
  const { compatibleTargets, compatibleSources } = useMemo(() => {
    if (!selectedBlockId) return { compatibleTargets: [], compatibleSources: [] };

    let selectedBlock;
    if (selectedBlockId === "start-block") {
      selectedBlock = startBlock;
    } else if (selectedBlockId === "end-block") {
      selectedBlock = endBlock;
    } else {
      selectedBlock = blocks.find(b => b.id === selectedBlockId);
    }

    if (!selectedBlock) return { compatibleTargets: [], compatibleSources: [] };

    return {
      compatibleTargets: getCompatibleTargets(selectedBlock, blocks, true),
      compatibleSources: getCompatibleSources(selectedBlock, blocks, true),
    };
  }, [selectedBlockId, blocks, startBlock, endBlock]);

  const getPortPosition = useCallback((blockId: string, isInput: boolean) => {
    let block;
    if (blockId === "start-block") block = startBlock;
    else if (blockId === "end-block") block = endBlock;
    else block = blocks.find(b => b.id === blockId);

    if (!block) return null;

    // Get base position
    const basePos = isInput ? getInputPortPosition(block) : getOutputPortPosition(block);

    // Apply drag offset if this block is being dragged
    if (dragTransform && dragTransform.blockId === blockId) {
      return {
        x: basePos.x + dragTransform.offset.x,
        y: basePos.y + dragTransform.offset.y,
      };
    }

    return basePos;
  }, [blocks, startBlock, endBlock, dragTransform]);

  const allBlocks = useMemo(() => [
    startBlock,
    ...blocks,
    endBlock,
  ], [startBlock, blocks, endBlock]);

  return (
    <g>
      {/* Render port dots for all blocks */}
      {allBlocks.map((block) => {
        const isSelected = block.id === selectedBlockId;

        // Check if connection already exists before highlighting
        const connectionToBlockExists = selectedBlockId && connections.some(conn =>
          conn.source.blockId === selectedBlockId && conn.target.blockId === block.id
        );
        const connectionFromBlockExists = selectedBlockId && connections.some(conn =>
          conn.source.blockId === block.id && conn.target.blockId === selectedBlockId
        );

        // Only highlight if compatible AND no connection exists
        const canReceiveFromSelected = selectedBlockId && compatibleTargets.includes(block.id) && !connectionToBlockExists;
        const canSendToSelected = selectedBlockId && compatibleSources.includes(block.id) && !connectionFromBlockExists;

        // Output port (right side) - skip for END block
        const outputPos = block.id !== "end-block" ? getPortPosition(block.id, false) : null;
        // Input port (left side) - skip for START block
        const inputPos = block.id !== "start-block" ? getPortPosition(block.id, true) : null;

        return (
          <g key={block.id}>
            {/* Output Port Dot (Right) */}
            {outputPos && (
              <circle
                cx={outputPos.x}
                cy={outputPos.y}
                r={6}
                fill={isSelected ? "#EF4444" : canSendToSelected ? "#3B82F6" : "#9CA3AF"}
                stroke="white"
                strokeWidth={2}
                style={{
                  pointerEvents: 'none',
                  filter: isSelected || canSendToSelected ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))" : "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                  transition: "fill 0.15s ease, filter 0.15s ease"
                }}
              />
            )}

            {/* Input Port Dot (Left) */}
            {inputPos && (
              <circle
                cx={inputPos.x}
                cy={inputPos.y}
                r={6}
                fill={isSelected ? "#3B82F6" : canReceiveFromSelected ? "#EF4444" : "#9CA3AF"}
                stroke="white"
                strokeWidth={2}
                style={{
                  pointerEvents: 'none',
                  filter: isSelected || canReceiveFromSelected ? "drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))" : "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                  transition: "fill 0.15s ease, filter 0.15s ease"
                }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

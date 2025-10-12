import React from "react";
import { Block, BlockType } from "@/lib/types/blocks";
import { AssetBlock as AssetBlockType } from "@/lib/types/blocks";
import { AssetBlock } from "./AssetBlock";
import { ConditionBlock } from "./ConditionBlock";
import { ActionBlock } from "./ActionBlock";

interface BlockRendererProps {
  block: Block;
  blocks: Block[]; // All blocks to pass to components that need to look up connections
  zoom: number;
  isSelected?: boolean;
  isInConnectionMode?: boolean;
  isDimmed?: boolean;
  connectionModeActive?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDelete?: () => void;
  onEdit?: (block: Block) => void;
  dragOffset?: { x: number; y: number };
}

export function BlockRenderer({
  block,
  blocks,
  zoom,
  isSelected,
  isInConnectionMode,
  isDimmed,
  connectionModeActive,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  onEdit,
  dragOffset
}: BlockRendererProps) {
  switch (block.type) {
    case BlockType.ASSET:
      return (
        <AssetBlock
          block={block}
          zoom={zoom}
          isSelected={isSelected}
          isInConnectionMode={isInConnectionMode}
          isDimmed={isDimmed}
          connectionModeActive={connectionModeActive}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onDelete={onDelete}
          onEdit={onEdit ? (block) => onEdit(block) : undefined}
          dragOffset={dragOffset}
        />
      );
    case BlockType.CONDITION:
      return (
        <ConditionBlock
          block={block}
          blocks={blocks}
          zoom={zoom}
          isSelected={isSelected}
          isInConnectionMode={isInConnectionMode}
          isDimmed={isDimmed}
          connectionModeActive={connectionModeActive}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onDelete={onDelete}
          onEdit={onEdit ? (block) => onEdit(block) : undefined}
          dragOffset={dragOffset}
        />
      );
    case BlockType.ACTION:
      return (
        <ActionBlock
          block={block}
          blocks={blocks}
          zoom={zoom}
          isSelected={isSelected}
          isInConnectionMode={isInConnectionMode}
          isDimmed={isDimmed}
          connectionModeActive={connectionModeActive}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onDelete={onDelete}
          onEdit={onEdit ? (block) => onEdit(block) : undefined}
          dragOffset={dragOffset}
        />
      );
    default:
      return null;
  }
}

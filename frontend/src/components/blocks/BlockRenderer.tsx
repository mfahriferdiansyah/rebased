import React from "react";
import { Block, BlockType } from "@/lib/types/blocks";
import { AssetBlock } from "./AssetBlock";
import { ConditionBlock } from "./ConditionBlock";
import { ActionBlock } from "./ActionBlock";
import { TriggerBlock } from "./TriggerBlock";

interface BlockRendererProps {
  block: Block;
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

export function BlockRenderer({
  block,
  zoom,
  isSelected,
  isInConnectionMode,
  isDimmed,
  connectionModeActive,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onDelete,
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
          dragOffset={dragOffset}
        />
      );
    case BlockType.CONDITION:
      return (
        <ConditionBlock
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
          dragOffset={dragOffset}
        />
      );
    case BlockType.ACTION:
      return (
        <ActionBlock
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
          dragOffset={dragOffset}
        />
      );
    case BlockType.TRIGGER:
      return (
        <TriggerBlock
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
          dragOffset={dragOffset}
        />
      );
    default:
      return null;
  }
}

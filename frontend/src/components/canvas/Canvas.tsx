import React, { useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { Block } from "@/lib/types/blocks";
import { Connection } from "@/lib/types/strategy";
import type { Delegation } from "@/lib/types/delegation";
import { Grid } from "./Grid";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { StartBlock } from "../blocks/StartBlock";
import { EndBlock } from "../blocks/EndBlock";
import { ConnectionLine } from "../connections/ConnectionLine";
import { PreviewConnectionLine } from "../connections/PreviewConnectionLine";
import { PortHighlights } from "./PortHighlights";
import { ZoomControls } from "./ZoomControls";
import { canConnect, getOutputPortPosition, getInputPortPosition, getCompatibleTargets, getCompatibleSources } from "@/lib/utils/connectionValidation";

interface CanvasProps {
  blocks: Block[];
  connections: Connection[];
  selectedBlockId?: string | null;
  startBlockPos?: { x: number; y: number };
  endBlockPos?: { x: number; y: number };
  onBlockMove: (blockId: string, position: { x: number; y: number }) => void;
  onBlockSelect: (blockId: string) => void;
  onConnectionCreate?: (sourceId: string, targetId: string) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onBlockDelete?: (blockId: string) => void;
  onBlockEdit?: (block: Block) => void;
  onStartBlockMove?: (position: { x: number; y: number }) => void;
  onEndBlockMove?: (position: { x: number; y: number }) => void;

  // Delegation props
  activeDelegation?: Delegation | null;
  onDelegationClick?: () => void;
}

export interface CanvasHandle {
  resetZoom: () => void;
  centerOnPosition: (x: number, y: number) => void;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>((props, ref) => {
  const {
    blocks,
    connections,
    selectedBlockId,
    startBlockPos,
    endBlockPos,
    onBlockMove,
    onBlockSelect,
    onConnectionCreate,
    onConnectionDelete,
    onBlockDelete,
    onBlockEdit,
    onStartBlockMove,
    onEndBlockMove,
    activeDelegation,
    onDelegationClick,
  } = props;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [enableTransition, setEnableTransition] = useState(false);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drag threshold: minimum pixels to move before considering it a drag (not a click)
  const DRAG_THRESHOLD = 5;

  // START and END blocks positions (draggable) - use props or defaults
  const [internalStartPos, setInternalStartPos] = useState(startBlockPos || { x: 50, y: 200 });
  const [internalEndPos, setInternalEndPos] = useState(endBlockPos || { x: 1100, y: 200 });

  // Update internal positions when props change
  React.useEffect(() => {
    if (startBlockPos) setInternalStartPos(startBlockPos);
  }, [startBlockPos]);

  React.useEffect(() => {
    if (endBlockPos) setInternalEndPos(endBlockPos);
  }, [endBlockPos]);

  // Drag transform for smooth dragging (visual offset, not position update)
  const [dragTransform, setDragTransform] = useState<{
    blockId: string;
    offset: { x: number; y: number };
  } | null>(null);

  const startBlock = {
    id: "start-block",
    position: internalStartPos,
    size: { width: 180, height: 120 },
  };

  const endBlock = {
    id: "end-block",
    position: internalEndPos,
    size: { width: 180, height: 120 },
  };

  // Connection mode: track first selected block
  const [firstSelectedBlock, setFirstSelectedBlock] = useState<string | null>(null);

  // Hover state for preview connections
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  // Calculate eligible blocks for spotlight effect during connection mode
  const eligibleBlockIds = useMemo(() => {
    if (!firstSelectedBlock) return null;

    let selectedBlock;
    if (firstSelectedBlock === "start-block") {
      selectedBlock = startBlock;
    } else if (firstSelectedBlock === "end-block") {
      selectedBlock = endBlock;
    } else {
      selectedBlock = blocks.find(b => b.id === firstSelectedBlock);
    }

    if (!selectedBlock) return null;

    // Get all compatible targets and sources
    const targets = getCompatibleTargets(selectedBlock, blocks, true);
    const sources = getCompatibleSources(selectedBlock, blocks, true);

    // Combine and dedupe (block can be both target and source)
    const compatible = new Set([...targets, ...sources]);

    // Filter out blocks that already have a direct connection
    const eligible = new Set<string>();
    compatible.forEach(blockId => {
      const hasConnection = connections.some(conn =>
        (conn.source.blockId === firstSelectedBlock && conn.target.blockId === blockId) ||
        (conn.source.blockId === blockId && conn.target.blockId === firstSelectedBlock)
      );

      if (!hasConnection) {
        eligible.add(blockId);
      }
    });

    return eligible;
  }, [firstSelectedBlock, blocks, startBlock, endBlock, connections]);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback(
    (blockId: string, event: React.MouseEvent) => {
      event.stopPropagation();

      // Get current position
      let currentPos;
      if (blockId === "start-block") {
        currentPos = internalStartPos;
      } else if (blockId === "end-block") {
        currentPos = internalEndPos;
      } else {
        const block = blocks.find((b) => b.id === blockId);
        if (!block) return;
        currentPos = block.position;
      }

      // Calculate drag offset
      const offset = {
        x: event.clientX - currentPos.x * viewport.zoom,
        y: event.clientY - currentPos.y * viewport.zoom,
      };

      // Store initial mouse position for drag offset calculation
      dragStartPos.current = { x: event.clientX, y: event.clientY };

      setDraggedBlock(blockId);
      setDragOffset(offset);
      setIsDragging(false); // Will be set to true if mouse moves
      setDragTransform(null); // Clear any previous drag transform
      setHoveredBlockId(null); // Clear hover state when starting drag
    },
    [blocks, viewport.zoom, startBlockPos, endBlockPos]
  );

  const handleBlockMouseEnter = useCallback((blockId: string) => {
    setHoveredBlockId(blockId);
  }, []);

  const handleBlockMouseLeave = useCallback(() => {
    setHoveredBlockId(null);
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!draggedBlock || !dragStartPos.current) return;

      // Calculate offset from drag start position - SYNCHRONOUSLY
      const offsetX = (event.clientX - dragStartPos.current.x) / viewport.zoom;
      const offsetY = (event.clientY - dragStartPos.current.y) / viewport.zoom;

      // Calculate distance moved to determine if it's a drag or just a click jitter
      const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

      // Only mark as dragging if moved beyond threshold
      if (!isDragging && distance > DRAG_THRESHOLD) {
        setIsDragging(true);
      }

      // Update drag transform immediately (React batches these automatically)
      setDragTransform({
        blockId: draggedBlock,
        offset: { x: offsetX, y: offsetY },
      });
    },
    [draggedBlock, isDragging, viewport.zoom, DRAG_THRESHOLD]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent) => {
      if (!draggedBlock) return;

      // If wasn't dragging, it's a click for connection
      if (!isDragging) {
        const clickedBlockId = draggedBlock;

        // Check if this is second click for connection
        if (firstSelectedBlock && firstSelectedBlock !== clickedBlockId) {
          // Validate connection BEFORE creating
          const sourceBlockData = firstSelectedBlock === "start-block"
            ? startBlock
            : firstSelectedBlock === "end-block"
            ? endBlock
            : blocks.find(b => b.id === firstSelectedBlock);

          const targetBlockData = clickedBlockId === "start-block"
            ? startBlock
            : clickedBlockId === "end-block"
            ? endBlock
            : blocks.find(b => b.id === clickedBlockId);

          if (sourceBlockData && targetBlockData) {
            // Try forward direction first
            let isValidForward = canConnect(sourceBlockData, targetBlockData, blocks);
            let finalSource = firstSelectedBlock;
            let finalTarget = clickedBlockId;

            // If forward is invalid, try reverse direction
            if (!isValidForward) {
              const isValidReverse = canConnect(targetBlockData, sourceBlockData, blocks);
              if (isValidReverse) {
                // Swap the direction
                finalSource = clickedBlockId;
                finalTarget = firstSelectedBlock;
                isValidForward = true;
                console.log(`🔄 Auto-reversed: ${finalSource} → ${finalTarget}`);
              }
            }

            // Check if connection already exists (in the final direction)
            const connectionExists = connections.some(conn =>
              conn.source.blockId === finalSource &&
              conn.target.blockId === finalTarget
            );

            if (connectionExists) {
              console.log(`❌ Connection already exists: ${finalSource} → ${finalTarget}`);
            } else if (isValidForward && onConnectionCreate) {
              onConnectionCreate(finalSource, finalTarget);
              console.log(`✅ Connected: ${finalSource} → ${finalTarget}`);
            } else {
              console.log(`❌ Invalid connection: ${firstSelectedBlock} ↔ ${clickedBlockId}`);
            }
          }

          // Clear selection after attempt
          setFirstSelectedBlock(null);
          onBlockSelect("");
        } else {
          // First click - select block
          setFirstSelectedBlock(clickedBlockId);
          onBlockSelect(clickedBlockId);
          console.log(`Selected: ${clickedBlockId}`);
        }
      } else if (dragTransform) {
        // Was dragging - update final position ONCE
        const finalOffset = dragTransform.offset;

        if (draggedBlock === "start-block") {
          const newPos = {
            x: internalStartPos.x + finalOffset.x,
            y: internalStartPos.y + finalOffset.y,
          };
          setInternalStartPos(newPos);
          onStartBlockMove?.(newPos);
        } else if (draggedBlock === "end-block") {
          const newPos = {
            x: internalEndPos.x + finalOffset.x,
            y: internalEndPos.y + finalOffset.y,
          };
          setInternalEndPos(newPos);
          onEndBlockMove?.(newPos);
        } else {
          const block = blocks.find(b => b.id === draggedBlock);
          if (block) {
            onBlockMove(draggedBlock, {
              x: block.position.x + finalOffset.x,
              y: block.position.y + finalOffset.y,
            });
          }
        }
      }

      // Reset drag state
      setDraggedBlock(null);
      setIsDragging(false);
      setDragTransform(null);
      dragStartPos.current = null;
    },
    [draggedBlock, isDragging, dragTransform, firstSelectedBlock, onConnectionCreate, onBlockSelect, blocks, startBlock, endBlock, internalStartPos, internalEndPos, onBlockMove, onStartBlockMove, onEndBlockMove]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Deselect if clicking on canvas background
      if (e.target === canvasRef.current) {
        setFirstSelectedBlock(null);
        setHoveredBlockId(null);
        onBlockSelect("");
        console.log("Deselected");
      }
    },
    [onBlockSelect]
  );

  // Pan handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with left click
    // Blocks call stopPropagation, so this only fires on empty canvas areas
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
    }
  }, [viewport]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 3),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.5),
    }));
  }, []);

  const handleZoomReset = useCallback(() => {
    if (!canvasRef.current) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }

    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;

    // Get all blocks including START and END
    const allBlocks = [
      { position: internalStartPos, size: startBlock.size },
      { position: internalEndPos, size: endBlock.size },
      ...blocks.map(b => ({ position: b.position, size: b.size }))
    ];

    if (allBlocks.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }

    // Calculate bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    allBlocks.forEach(block => {
      const x1 = block.position.x;
      const y1 = block.position.y;
      const x2 = x1 + block.size.width;
      const y2 = y1 + block.size.height;

      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Add padding (15% on each side)
    const padding = 0.15;
    const paddedWidth = contentWidth * (1 + 2 * padding);
    const paddedHeight = contentHeight * (1 + 2 * padding);

    // Calculate zoom to fit (don't exceed max zoom of 3 or min zoom of 0.5)
    const zoomX = canvasWidth / paddedWidth;
    const zoomY = canvasHeight / paddedHeight;
    const zoom = Math.max(0.5, Math.min(Math.min(zoomX, zoomY), 3));

    // Calculate center of content
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    // Calculate pan to center content in canvas
    const x = (canvasWidth / 2) - (contentCenterX * zoom);
    const y = (canvasHeight / 2) - (contentCenterY * zoom);

    setViewport({ x, y, zoom });
  }, [blocks, internalStartPos, internalEndPos, startBlock.size, endBlock.size]);

  // Center viewport on a specific position
  const handleCenterOnPosition = useCallback((x: number, y: number) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // Calculate viewport offset to center on the given position
    // using current zoom level
    const newX = (canvasWidth / 2) - (x * viewport.zoom);
    const newY = (canvasHeight / 2) - (y * viewport.zoom);

    // Enable smooth transition for centering
    setEnableTransition(true);
    setViewport(prev => ({ ...prev, x: newX, y: newY }));

    // Disable transition after animation completes (500ms)
    setTimeout(() => setEnableTransition(false), 500);
  }, [viewport.zoom]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    resetZoom: handleZoomReset,
    centerOnPosition: handleCenterOnPosition,
  }), [handleZoomReset, handleCenterOnPosition]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + scroll
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport(prev => ({
        ...prev,
        zoom: Math.max(0.5, Math.min(3, prev.zoom * delta)),
      }));
    } else {
      // Pan with normal scroll (like Excalidraw)
      e.preventDefault();
      setViewport(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  // Attach non-passive wheel event listener to enable preventDefault
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full bg-white overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        overscrollBehaviorX: 'none',
        overscrollBehaviorY: 'none',
        touchAction: 'none',
      }}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleCanvasMouseMove(e);
      }}
      onMouseUp={(e) => {
        handleMouseUp(e);
        handleCanvasMouseUp();
      }}
      onMouseLeave={(e) => {
        handleMouseUp(e);
        handleCanvasMouseUp();
      }}
      onMouseDown={handleCanvasMouseDown}
      onClick={handleCanvasClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid background */}
      <Grid zoom={viewport.zoom} />

      {/* Zoom Controls */}
      <ZoomControls
        zoom={viewport.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />

      {/* Container with zoom and pan transforms */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
          transition: enableTransition ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
      {/* SVG layer for connections */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: 'none', overflow: 'visible' }}>
        {/* User connections */}
        {connections.map((connection) => (
          <ConnectionLine
            key={connection.id}
            connection={connection}
            blocks={blocks}
            zoom={viewport.zoom}
            startBlock={startBlock}
            endBlock={endBlock}
            onDelete={onConnectionDelete}
            dragTransform={dragTransform}
          />
        ))}

        {/* Preview connection line */}
        {(() => {
          // Only show preview if:
          // 1. A block is selected for connection (firstSelectedBlock)
          // 2. Mouse is hovering over another block (hoveredBlockId)
          // 3. Not currently dragging
          // 4. The two blocks can be connected (validation)
          if (!firstSelectedBlock || !hoveredBlockId || isDragging || firstSelectedBlock === hoveredBlockId) {
            return null;
          }

          // Get source block
          let sourceBlockData;
          if (firstSelectedBlock === "start-block") {
            sourceBlockData = startBlock;
          } else if (firstSelectedBlock === "end-block") {
            sourceBlockData = endBlock;
          } else {
            sourceBlockData = blocks.find(b => b.id === firstSelectedBlock);
          }

          // Get target block
          let targetBlockData;
          if (hoveredBlockId === "start-block") {
            targetBlockData = startBlock;
          } else if (hoveredBlockId === "end-block") {
            targetBlockData = endBlock;
          } else {
            targetBlockData = blocks.find(b => b.id === hoveredBlockId);
          }

          // Validate both blocks exist and can connect
          if (!sourceBlockData || !targetBlockData) {
            return null;
          }

          // Try forward direction first
          let isValidForward = canConnect(sourceBlockData, targetBlockData, blocks);
          let finalSourceId = firstSelectedBlock;
          let finalTargetId = hoveredBlockId;
          let finalSourceBlock = sourceBlockData;
          let finalTargetBlock = targetBlockData;

          // If forward is invalid, try reverse direction
          if (!isValidForward) {
            const isValidReverse = canConnect(targetBlockData, sourceBlockData, blocks);
            if (isValidReverse) {
              // Swap the direction for preview
              finalSourceId = hoveredBlockId;
              finalTargetId = firstSelectedBlock;
              finalSourceBlock = targetBlockData;
              finalTargetBlock = sourceBlockData;
              isValidForward = true;
            }
          }

          // If neither direction is valid, don't show preview
          if (!isValidForward) {
            return null;
          }

          // Check if connection already exists (in the final direction)
          const connectionExists = connections.some(conn =>
            conn.source.blockId === finalSourceId &&
            conn.target.blockId === finalTargetId
          );

          if (connectionExists) {
            return null;
          }

          // Calculate source and target points (using final direction)
          let sourcePoint = getOutputPortPosition(finalSourceBlock);
          let targetPoint = getInputPortPosition(finalTargetBlock);

          // Apply drag offset if source block is being dragged
          if (dragTransform && dragTransform.blockId === finalSourceId) {
            sourcePoint = {
              x: sourcePoint.x + dragTransform.offset.x,
              y: sourcePoint.y + dragTransform.offset.y,
            };
          }

          // Apply drag offset if target block is being dragged
          if (dragTransform && dragTransform.blockId === finalTargetId) {
            targetPoint = {
              x: targetPoint.x + dragTransform.offset.x,
              y: targetPoint.y + dragTransform.offset.y,
            };
          }

          // Determine line color based on direction
          // If connecting FROM selected block (forward): RED (output port)
          // If connecting TO selected block (reverse): BLUE (input port)
          const lineColor = finalSourceId === firstSelectedBlock ? "#EF4444" : "#3B82F6";

          return (
            <PreviewConnectionLine
              sourcePoint={sourcePoint}
              targetPoint={targetPoint}
              zoom={viewport.zoom}
              color={lineColor}
            />
          );
        })()}
      </svg>

      {/* All Blocks (START, END, and User Blocks) */}
      <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
        {/* START Block */}
        <div data-block-id="start-block" style={{ pointerEvents: 'auto' }}>
          <StartBlock
            position={startBlock.position}
            size={startBlock.size}
            zoom={viewport.zoom}
            isSelected={selectedBlockId === "start-block"}
            isInConnectionMode={firstSelectedBlock === "start-block"}
            isDimmed={firstSelectedBlock !== null && eligibleBlockIds !== null && !eligibleBlockIds.has("start-block") && firstSelectedBlock !== "start-block"}
            connectionModeActive={firstSelectedBlock !== null}
            onMouseDown={(e) => handleMouseDown("start-block", e)}
            onMouseEnter={() => handleBlockMouseEnter("start-block")}
            onMouseLeave={handleBlockMouseLeave}
            dragOffset={dragTransform?.blockId === "start-block" ? dragTransform.offset : undefined}
            activeDelegation={activeDelegation}
            onDelegationClick={onDelegationClick}
          />
        </div>

        {/* END Block */}
        <div data-block-id="end-block" style={{ pointerEvents: 'auto' }}>
          <EndBlock
            position={endBlock.position}
            size={endBlock.size}
            zoom={viewport.zoom}
            isSelected={selectedBlockId === "end-block"}
            isInConnectionMode={firstSelectedBlock === "end-block"}
            isDimmed={firstSelectedBlock !== null && eligibleBlockIds !== null && !eligibleBlockIds.has("end-block") && firstSelectedBlock !== "end-block"}
            connectionModeActive={firstSelectedBlock !== null}
            onMouseDown={(e) => handleMouseDown("end-block", e)}
            onMouseEnter={() => handleBlockMouseEnter("end-block")}
            onMouseLeave={handleBlockMouseLeave}
            dragOffset={dragTransform?.blockId === "end-block" ? dragTransform.offset : undefined}
          />
        </div>

        {/* User Blocks */}
        {blocks.map((block) => (
          <div key={block.id} data-block-id={block.id} style={{ pointerEvents: 'auto' }}>
            <BlockRenderer
              block={block}
              blocks={blocks}
              zoom={viewport.zoom}
              isSelected={block.id === selectedBlockId}
              isInConnectionMode={firstSelectedBlock === block.id}
              isDimmed={firstSelectedBlock !== null && eligibleBlockIds !== null && !eligibleBlockIds.has(block.id) && firstSelectedBlock !== block.id}
              connectionModeActive={firstSelectedBlock !== null}
              onMouseDown={(e) => handleMouseDown(block.id, e)}
              onMouseEnter={() => handleBlockMouseEnter(block.id)}
              onMouseLeave={handleBlockMouseLeave}
              onDelete={() => onBlockDelete?.(block.id)}
              onEdit={onBlockEdit}
              dragOffset={dragTransform?.blockId === block.id ? dragTransform.offset : undefined}
            />
          </div>
        ))}
      </div>

      {/* SVG layer for port dots - ABOVE blocks */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 3, pointerEvents: 'none', overflow: 'visible' }}>
        <PortHighlights
          selectedBlockId={selectedBlockId || null}
          blocks={blocks}
          connections={connections}
          startBlock={startBlock}
          endBlock={endBlock}
          dragTransform={dragTransform}
        />
      </svg>
      </div>
    </div>
  );
});

Canvas.displayName = "Canvas";

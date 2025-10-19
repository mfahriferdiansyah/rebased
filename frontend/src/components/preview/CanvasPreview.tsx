import React, { useRef, useState, useCallback } from "react";
import { Block } from "@/lib/types/blocks";
import { Connection } from "@/lib/types/strategy";
import { Grid } from "../canvas/Grid";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { StartBlock } from "../blocks/StartBlock";
import { EndBlock } from "../blocks/EndBlock";
import { ConnectionLine } from "../connections/ConnectionLine";

interface CanvasPreviewProps {
  blocks: Block[];
  connections: Connection[];
  startBlockPos?: { x: number; y: number };
  endBlockPos?: { x: number; y: number };
  className?: string;
}

/**
 * Miniature canvas preview component
 * Read-only, pan-only, no editing capabilities
 */
export function CanvasPreview({
  blocks,
  connections,
  startBlockPos,
  endBlockPos,
  className = "",
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initial zoom set to fit content
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.3 });

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // START and END blocks positions
  const internalStartPos = startBlockPos || { x: 50, y: 200 };
  const internalEndPos = endBlockPos || { x: 1100, y: 200 };

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

  // Pan handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
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

  // Wheel handler for zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + scroll
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport(prev => ({
        ...prev,
        zoom: Math.max(0.1, Math.min(1, prev.zoom * delta)),
      }));
    } else {
      // Pan with normal scroll
      e.preventDefault();
      setViewport(prev => ({
        ...prev,
        x: prev.x - e.deltaX * 0.5,
        y: prev.y - e.deltaY * 0.5,
      }));
    }
  }, []);

  // Attach wheel event listener
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Center view on mount
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;

    // Get all blocks including START and END
    const allBlocks = [
      { position: internalStartPos, size: startBlock.size },
      { position: internalEndPos, size: endBlock.size },
      ...blocks.map(b => ({ position: b.position, size: b.size }))
    ];

    if (allBlocks.length === 0) return;

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

    // Add padding
    const padding = 0.2;
    const paddedWidth = contentWidth * (1 + 2 * padding);
    const paddedHeight = contentHeight * (1 + 2 * padding);

    // Calculate zoom to fit
    const zoomX = canvasWidth / paddedWidth;
    const zoomY = canvasHeight / paddedHeight;
    const zoom = Math.max(0.1, Math.min(Math.min(zoomX, zoomY), 1));

    // Calculate center of content
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    // Calculate pan to center content in canvas
    const x = (canvasWidth / 2) - (contentCenterX * zoom);
    const y = (canvasHeight / 2) - (contentCenterY * zoom);

    setViewport({ x, y, zoom });
  }, [blocks, internalStartPos, internalEndPos]);

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full bg-white overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      style={{
        overscrollBehaviorX: 'none',
        overscrollBehaviorY: 'none',
        touchAction: 'none',
      }}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid background */}
      <Grid zoom={viewport.zoom} />

      {/* Hint text */}
      <div className="absolute top-2 left-2 text-[10px] text-gray-400 pointer-events-none select-none">
        Drag to pan • Scroll to zoom
      </div>

      {/* Container with zoom and pan transforms */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
        }}
      >
        {/* SVG layer for connections */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: 'none', overflow: 'visible' }}>
          {connections.map((connection) => (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              blocks={blocks}
              zoom={viewport.zoom}
              startBlock={startBlock}
              endBlock={endBlock}
              onDelete={undefined}
              dragTransform={undefined}
            />
          ))}
        </svg>

        {/* All Blocks (START, END, and User Blocks) */}
        <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
          {/* START Block */}
          <div data-block-id="start-block" style={{ pointerEvents: 'none' }}>
            <StartBlock
              position={startBlock.position}
              size={startBlock.size}
              zoom={viewport.zoom}
              isSelected={false}
              isInConnectionMode={false}
              isDimmed={false}
              connectionModeActive={false}
              onMouseDown={() => {}}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
              dragOffset={undefined}
              activeDelegation={undefined}
              onDelegationClick={undefined}
            />
          </div>

          {/* END Block */}
          <div data-block-id="end-block" style={{ pointerEvents: 'none' }}>
            <EndBlock
              position={endBlock.position}
              size={endBlock.size}
              zoom={viewport.zoom}
              isSelected={false}
              isInConnectionMode={false}
              isDimmed={false}
              connectionModeActive={false}
              onMouseDown={() => {}}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
              dragOffset={undefined}
            />
          </div>

          {/* User Blocks */}
          {blocks.map((block) => (
            <div key={block.id} data-block-id={block.id} style={{ pointerEvents: 'none' }}>
              <BlockRenderer
                block={block}
                blocks={blocks}
                zoom={viewport.zoom}
                isSelected={false}
                isInConnectionMode={false}
                isDimmed={false}
                connectionModeActive={false}
                onMouseDown={() => {}}
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                onDelete={undefined}
                onEdit={undefined}
                dragOffset={undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

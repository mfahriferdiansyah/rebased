import { useRef, useEffect } from "react";
import { Canvas, CanvasHandle } from "@/components/canvas/Canvas";
import { FloatingChatPanel } from "@/components/ai-chat/FloatingChatPanel";
import { FloatingToolbar } from "@/components/toolbar/FloatingToolbar";
import { FloatingWorkflowPanel } from "@/components/workflow/FloatingWorkflowPanel";
import { LogoMarquee } from "@/components/layout/LogoMarquee";
import { useCanvas } from "@/hooks/useCanvas";
import { Button } from "@/components/ui/button";
import { BlockType } from "@/lib/types/blocks";
import { Target } from "lucide-react";

const Index = () => {
  const canvasRef = useRef<CanvasHandle>(null);
  const {
    strategy,
    selectedBlockId,
    setStrategy,
    handleBlockMove,
    handleStartBlockMove,
    handleEndBlockMove,
    handleBlockSelect,
    handleConnectionCreate,
    handleConnectionDelete,
    handleBlockDelete,
    createDemoStrategy,
    addBlock,
    resetCanvas,
    autoLayout,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = useCanvas();

  // Helper function to calculate position for new block without overlaps
  const calculateNewBlockPosition = (existingBlocks: any[]) => {
    if (existingBlocks.length === 0) {
      return { x: 400, y: 150 };
    }

    // Constants for layout
    const BLOCK_WIDTH = 200;
    const BLOCK_HEIGHT = 150;
    const HORIZONTAL_SPACING = 50;
    const VERTICAL_SPACING = 50;
    const MAX_X = 1200; // Max x before starting new row
    const START_X = 400;
    const START_Y = 150;

    // Find the rightmost and bottommost blocks
    let maxX = 0;
    let maxY = 0;
    let rightmostInRow: any = null;

    existingBlocks.forEach(block => {
      const blockRight = block.position.x + BLOCK_WIDTH;
      const blockBottom = block.position.y + BLOCK_HEIGHT;

      if (blockBottom > maxY) {
        maxY = blockBottom;
      }

      if (blockRight > maxX) {
        maxX = blockRight;
        rightmostInRow = block;
      }
    });

    // Try to place to the right of the rightmost block
    if (rightmostInRow) {
      const newX = rightmostInRow.position.x + BLOCK_WIDTH + HORIZONTAL_SPACING;

      // If it fits in the current row, place it there
      if (newX + BLOCK_WIDTH <= MAX_X) {
        return { x: newX, y: rightmostInRow.position.y };
      }
    }

    // Otherwise, start a new row below
    return { x: START_X, y: maxY + VERTICAL_SPACING };
  };

  const handleBlockAdd = (type: BlockType) => {
    // Calculate position to avoid overlaps
    const position = strategy ? calculateNewBlockPosition(strategy.blocks) : { x: 400, y: 150 };

    // Create a new block of the specified type
    const newBlock = {
      id: `block-${Date.now()}`,
      type,
      position,
      size: { width: 200, height: 150 },
      data: type === BlockType.ASSET ? {
        symbol: "NEW",
        name: "New Asset",
        initialWeight: 0,
        icon: "💎",
      } : type === BlockType.CONDITION ? {
        operator: "GT" as const,
        leftOperand: { type: "price" as const, asset: "ETH" },
        rightOperand: { type: "value" as const, value: 0 },
      } : type === BlockType.ACTION ? {
        actionType: "rebalance" as const,
        targets: [],
      } : {
        triggerType: "interval" as const,
        config: { interval: 3600 },
      },
      connections: { inputs: [], outputs: [] },
    };
    addBlock(newBlock as any);

    // Center viewport on the newly added block for UX feedback
    // Wait for DOM update, then center on middle of block (200x150, so center is +100, +75)
    setTimeout(() => {
      canvasRef.current?.centerOnPosition(position.x + 100, position.y + 75);
    }, 50);
  };

  const handleAutoLayoutWithZoom = () => {
    autoLayout();
    // Reset zoom after a short delay to allow layout to complete
    setTimeout(() => {
      canvasRef.current?.resetZoom();
    }, 50);
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') {
        // Redo: Cmd+Shift+Z or Ctrl+Shift+Z
        e.preventDefault();
        handleRedo();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        // Undo: Cmd+Z or Ctrl+Z
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Canvas Area */}
      <div
        className="flex-1 relative"
        style={{
          overscrollBehaviorX: 'none',
          overscrollBehaviorY: 'none',
          touchAction: 'none',
        }}
      >
        {strategy ? (
          <>
            <Canvas
              ref={canvasRef}
              blocks={strategy.blocks}
              connections={strategy.connections}
              selectedBlockId={selectedBlockId}
              startBlockPos={strategy.startBlockPosition}
              endBlockPos={strategy.endBlockPosition}
              onBlockMove={handleBlockMove}
              onStartBlockMove={handleStartBlockMove}
              onEndBlockMove={handleEndBlockMove}
              onBlockSelect={handleBlockSelect}
              onConnectionCreate={handleConnectionCreate}
              onConnectionDelete={handleConnectionDelete}
              onBlockDelete={handleBlockDelete}
            />

            {/* Floating Toolbar */}
            <FloatingToolbar
              strategy={strategy}
              onBlockAdd={handleBlockAdd}
              onStrategyLoad={setStrategy}
              onReset={resetCanvas}
              onAutoLayout={handleAutoLayoutWithZoom}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </>
        ) : (
          <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Grid background with diamond fade */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                zIndex: 0,
                maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                maskComposite: 'intersect',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                WebkitMaskComposite: 'source-in'
              }}
            >
              <defs>
                <pattern
                  id="landing-grid"
                  width="30"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 30 0 L 0 0 0 30"
                    fill="none"
                    stroke="rgba(226, 232, 240, 0.4)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#landing-grid)" />
            </svg>

            {/* Logo Marquee at the top */}
            <LogoMarquee />

            {/* Landing Content - centered vertically in remaining space */}
            <div className="flex-1 flex flex-col items-center justify-center relative" style={{ zIndex: 1 }}>
              <div className="text-center max-w-lg px-6">
                <div className="w-16 h-16 mx-auto mb-6 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Target className="w-9 h-9 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Welcome to Rebased
                </h2>
                <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                  Build visual portfolio rebalancing strategies with drag-and-drop blocks.
                  Use AI to generate strategies from natural language.
                </p>
                <Button
                  onClick={createDemoStrategy}
                  size="lg"
                  className="
                    rounded px-6 py-3 text-sm
                    bg-gray-900
                    text-white font-semibold
                    hover:bg-gray-800
                    transition-all duration-200
                  "
                >
                  Load Demo Strategy
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Floating AI Chat Panel */}
        <FloatingChatPanel onStrategyGenerated={setStrategy} />

        {/* Floating Workflow Panel */}
        <FloatingWorkflowPanel strategy={strategy} />
      </div>
    </div>
  );
};

export default Index;

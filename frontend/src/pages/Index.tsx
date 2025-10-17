import { useRef, useEffect, useState } from "react";
import { Canvas, CanvasHandle } from "@/components/canvas/Canvas";
import { FloatingChatPanel } from "@/components/ai-chat/FloatingChatPanel";
import { FloatingToolbar } from "@/components/toolbar/FloatingToolbar";
import { FloatingWorkflowPanel } from "@/components/workflow/FloatingWorkflowPanel";
import { LogoMarquee } from "@/components/layout/LogoMarquee";
import { Navbar } from "@/components/layout/Navbar";
import { useCanvas } from "@/hooks/useCanvas";
import { useDelegation } from "@/hooks/useDelegation";
import { useStrategy } from "@/hooks/useStrategy";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BlockType, Block, AssetBlock, ConditionBlock, ActionBlock } from "@/lib/types/blocks";
import { AssetBlockEditModal } from "@/components/blocks/AssetBlockEditModal";
import { ConditionBlockEditModal } from "@/components/blocks/ConditionBlockEditModal";
import { ActionBlockEditModal } from "@/components/blocks/ActionBlockEditModal";
import { DelegationManagerModal } from "@/components/delegation/DelegationManagerModal";
import { StrategySetupWizard } from "@/components/wizard/StrategySetupWizard";
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
    handleBlockUpdate,
    createDemoStrategy,
    addBlock,
    resetCanvas,
    autoLayout,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = useCanvas();

  // Delegation hook - get chainId from strategy if available
  const strategyChainId = strategy?.blocks.find(b => b.type === BlockType.ASSET)?.data.chainId;
  const { activeDelegation, refreshDelegations } = useDelegation(strategyChainId);

  // Strategy hook for saving
  const { saveStrategy, saving } = useStrategy();
  const { toast } = useToast();

  // Editing state for AssetBlockEditModal
  const [editingAssetBlock, setEditingAssetBlock] = useState<AssetBlock | null>(null);
  const [isAssetEditModalOpen, setIsAssetEditModalOpen] = useState(false);

  // Editing state for ConditionBlockEditModal
  const [editingConditionBlock, setEditingConditionBlock] = useState<ConditionBlock | null>(null);
  const [isConditionEditModalOpen, setIsConditionEditModalOpen] = useState(false);

  // Editing state for ActionBlockEditModal
  const [editingActionBlock, setEditingActionBlock] = useState<ActionBlock | null>(null);
  const [isActionEditModalOpen, setIsActionEditModalOpen] = useState(false);

  // Delegation manager modal state
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);

  // Strategy setup wizard modal state
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  // Handle block edit
  const handleBlockEdit = (block: Block) => {
    if (block.type === BlockType.ASSET) {
      setEditingAssetBlock(block as AssetBlock);
      setIsAssetEditModalOpen(true);
    } else if (block.type === BlockType.CONDITION) {
      setEditingConditionBlock(block as ConditionBlock);
      setIsConditionEditModalOpen(true);
    } else if (block.type === BlockType.ACTION) {
      setEditingActionBlock(block as ActionBlock);
      setIsActionEditModalOpen(true);
    }
  };

  // Handle asset block save from edit modal
  const handleAssetBlockSave = (data: AssetBlock['data']) => {
    if (editingAssetBlock) {
      // Editing existing block
      handleBlockUpdate(editingAssetBlock.id, data);
    } else {
      // Creating new block
      const position = strategy ? calculateNewBlockPosition(strategy.blocks) : { x: 400, y: 150 };
      const newBlock: AssetBlock = {
        id: `block-${Date.now()}`,
        type: BlockType.ASSET,
        position,
        size: { width: 200, height: 150 },
        data,
        connections: { inputs: [], outputs: [] },
      };
      addBlock(newBlock);

      // Center viewport on the newly added block
      setTimeout(() => {
        canvasRef.current?.centerOnPosition(position.x + 100, position.y + 75);
      }, 50);
    }

    setIsAssetEditModalOpen(false);
    setEditingAssetBlock(null);
  };

  // Handle condition block save from edit modal
  const handleConditionBlockSave = (data: ConditionBlock['data']) => {
    if (editingConditionBlock) {
      // Editing existing block
      handleBlockUpdate(editingConditionBlock.id, data);
    } else {
      // Creating new block
      const position = strategy ? calculateNewBlockPosition(strategy.blocks) : { x: 400, y: 150 };
      const newBlock: ConditionBlock = {
        id: `block-${Date.now()}`,
        type: BlockType.CONDITION,
        position,
        size: { width: 200, height: 150 },
        data,
        connections: { inputs: [], outputs: [] },
      };
      addBlock(newBlock);

      // Center viewport on the newly added block
      setTimeout(() => {
        canvasRef.current?.centerOnPosition(position.x + 100, position.y + 75);
      }, 50);
    }

    setIsConditionEditModalOpen(false);
    setEditingConditionBlock(null);
  };

  // Handle action block save from edit modal
  const handleActionBlockSave = (data: ActionBlock['data']) => {
    if (editingActionBlock) {
      // Editing existing block
      handleBlockUpdate(editingActionBlock.id, data);
    } else {
      // Creating new block
      const position = strategy ? calculateNewBlockPosition(strategy.blocks) : { x: 400, y: 150 };
      const newBlock: ActionBlock = {
        id: `block-${Date.now()}`,
        type: BlockType.ACTION,
        position,
        size: { width: 200, height: 180 },
        data,
        connections: { inputs: [], outputs: [] },
      };
      addBlock(newBlock);

      // Center viewport on the newly added block
      setTimeout(() => {
        canvasRef.current?.centerOnPosition(position.x + 100, position.y + 90);
      }, 50);
    }

    setIsActionEditModalOpen(false);
    setEditingActionBlock(null);
  };

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
    // Open appropriate edit modal based on block type
    if (type === BlockType.ASSET) {
      setIsAssetEditModalOpen(true);
      setEditingAssetBlock(null); // null means creating new, not editing
      return;
    }

    if (type === BlockType.CONDITION) {
      setIsConditionEditModalOpen(true);
      setEditingConditionBlock(null);
      return;
    }

    if (type === BlockType.ACTION) {
      setIsActionEditModalOpen(true);
      setEditingActionBlock(null);
      return;
    }
  };

  const handleAutoLayoutWithZoom = () => {
    autoLayout();
    // Reset zoom after a short delay to allow layout to complete
    setTimeout(() => {
      canvasRef.current?.resetZoom();
    }, 50);
  };

  // Handle strategy save
  const handleStrategySave = async () => {
    if (!strategy) {
      toast({
        title: 'No Strategy',
        description: 'Please create a strategy first',
        variant: 'destructive',
      });
      return;
    }

    // Validate strategy has asset blocks
    const assetBlocks = strategy.blocks.filter(b => b.type === BlockType.ASSET);
    if (assetBlocks.length === 0) {
      toast({
        title: 'Invalid Strategy',
        description: 'Strategy must have at least one asset block',
        variant: 'destructive',
      });
      return;
    }

    // Get chainId from first asset block
    const chainId = (assetBlocks[0] as AssetBlock).data.chainId;

    // Validate all assets are on the same chain
    const allSameChain = assetBlocks.every(
      b => (b as AssetBlock).data.chainId === chainId
    );
    if (!allSameChain) {
      toast({
        title: 'Invalid Strategy',
        description: 'All assets must be on the same chain',
        variant: 'destructive',
      });
      return;
    }

    // Save strategy
    await saveStrategy(strategy, chainId);
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
      {/* Navbar */}
      <Navbar />

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
              onBlockEdit={handleBlockEdit}
              activeDelegation={activeDelegation}
              onDelegationClick={async () => {
                // Show wizard for first-time setup, or delegation modal for managing existing
                if (!activeDelegation) {
                  // Validate strategy before opening wizard
                  if (!strategy) {
                    toast({
                      title: 'No Strategy',
                      description: 'Please create a strategy first',
                      variant: 'destructive',
                    });
                    return;
                  }

                  const assetBlocks = strategy.blocks.filter(b => b.type === BlockType.ASSET);
                  if (assetBlocks.length === 0) {
                    toast({
                      title: 'Invalid Strategy',
                      description: 'Strategy must have at least one asset block',
                      variant: 'destructive',
                    });
                    return;
                  }

                  const chainId = (assetBlocks[0] as AssetBlock).data.chainId;
                  const allSameChain = assetBlocks.every(
                    b => (b as AssetBlock).data.chainId === chainId
                  );
                  if (!allSameChain) {
                    toast({
                      title: 'Invalid Strategy',
                      description: 'All assets must be on the same chain',
                      variant: 'destructive',
                    });
                    return;
                  }

                  // Open wizard directly (no save yet - deploy on-chain first)
                  setIsSetupWizardOpen(true);
                } else {
                  setIsDelegationModalOpen(true);
                }
              }}
            />

            {/* Floating Toolbar */}
            <FloatingToolbar
              strategy={strategy}
              onBlockAdd={handleBlockAdd}
              onStrategyLoad={setStrategy}
              onStrategySave={handleStrategySave}
              onReset={resetCanvas}
              onAutoLayout={handleAutoLayoutWithZoom}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              isSaving={saving}
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

        {/* Asset Block Edit Modal */}
        <AssetBlockEditModal
          open={isAssetEditModalOpen}
          onOpenChange={setIsAssetEditModalOpen}
          blockData={editingAssetBlock?.data}
          onSave={handleAssetBlockSave}
        />

        {/* Condition Block Edit Modal */}
        <ConditionBlockEditModal
          open={isConditionEditModalOpen}
          onOpenChange={setIsConditionEditModalOpen}
          blockData={editingConditionBlock?.data}
          onSave={handleConditionBlockSave}
        />

        {/* Action Block Edit Modal */}
        <ActionBlockEditModal
          open={isActionEditModalOpen}
          onOpenChange={setIsActionEditModalOpen}
          blockData={editingActionBlock?.data}
          onSave={handleActionBlockSave}
        />

        {/* Delegation Manager Modal */}
        <DelegationManagerModal
          open={isDelegationModalOpen}
          onOpenChange={setIsDelegationModalOpen}
        />

        {/* Strategy Setup Wizard */}
        <StrategySetupWizard
          open={isSetupWizardOpen}
          onOpenChange={setIsSetupWizardOpen}
          strategy={strategy!}
          chainId={strategy?.blocks.find(b => b.type === BlockType.ASSET)?.data.chainId || 10143}
          onComplete={async () => {
            // Refresh delegations to show new delegation on START block
            await refreshDelegations();
            // Show success toast
            toast({
              title: 'Setup Complete!',
              description: 'Your strategy is now active and delegated to the bot.',
            });
          }}
        />
      </div>
    </div>
  );
};

export default Index;

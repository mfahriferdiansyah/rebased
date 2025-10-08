import { useState, useCallback, useRef } from "react";
import { Block, BlockType } from "@/lib/types/blocks";
import { Strategy, Connection } from "@/lib/types/strategy";

const MAX_HISTORY = 50; // Limit history to prevent memory issues

export function useCanvas() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [history, setHistory] = useState<Strategy[]>([]);
  const [future, setFuture] = useState<Strategy[]>([]);
  const isUndoRedoAction = useRef(false);

  // Helper to deep clone strategy
  const cloneStrategy = (strat: Strategy): Strategy => {
    return structuredClone(strat);
  };

  // Save current state to history before making changes
  const saveToHistory = useCallback(() => {
    if (!strategy || isUndoRedoAction.current) return;

    setHistory(prev => {
      const newHistory = [...prev, cloneStrategy(strategy)];
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    // Clear future when new action occurs
    setFuture([]);
  }, [strategy]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    isUndoRedoAction.current = true;

    setHistory(prev => {
      const newHistory = [...prev];
      const previousState = newHistory.pop();

      if (previousState && strategy) {
        setFuture(prevFuture => [...prevFuture, cloneStrategy(strategy)]);
        setStrategy(previousState);
      }

      isUndoRedoAction.current = false;
      return newHistory;
    });
  }, [history, strategy]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;

    isUndoRedoAction.current = true;

    setFuture(prev => {
      const newFuture = [...prev];
      const nextState = newFuture.pop();

      if (nextState && strategy) {
        setHistory(prevHistory => [...prevHistory, cloneStrategy(strategy)]);
        setStrategy(nextState);
      }

      isUndoRedoAction.current = false;
      return newFuture;
    });
  }, [future, strategy]);

  const handleBlockMove = useCallback((blockId: string, position: { x: number; y: number }) => {
    saveToHistory();
    setStrategy((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        blocks: prev.blocks.map((block) =>
          block.id === blockId ? { ...block, position } : block
        ),
        metadata: {
          ...prev.metadata,
          updatedAt: Date.now(),
        },
      };
    });
  }, [saveToHistory]);

  const handleStartBlockMove = useCallback((position: { x: number; y: number }) => {
    saveToHistory();
    setStrategy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        startBlockPosition: position,
        metadata: {
          ...prev.metadata,
          updatedAt: Date.now(),
        },
      };
    });
  }, [saveToHistory]);

  const handleEndBlockMove = useCallback((position: { x: number; y: number }) => {
    saveToHistory();
    setStrategy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        endBlockPosition: position,
        metadata: {
          ...prev.metadata,
          updatedAt: Date.now(),
        },
      };
    });
  }, [saveToHistory]);

  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId || null);
  }, []);

  const handleConnectionCreate = useCallback((sourceId: string, targetId: string) => {
    saveToHistory();
    setStrategy((prev) => {
      if (!prev) return prev;

      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        source: { blockId: sourceId, port: "output" },
        target: { blockId: targetId, port: "input" },
      };

      // Update block-level connections for non-START/END blocks
      const updatedBlocks = prev.blocks.map(block => {
        if (block.id === sourceId) {
          return {
            ...block,
            connections: {
              ...block.connections,
              outputs: [...block.connections.outputs, targetId],
            },
          };
        }
        if (block.id === targetId) {
          return {
            ...block,
            connections: {
              ...block.connections,
              inputs: [...block.connections.inputs, sourceId],
            },
          };
        }
        return block;
      });

      return {
        ...prev,
        blocks: updatedBlocks,
        connections: [...prev.connections, newConnection],
        metadata: {
          ...prev.metadata,
          updatedAt: Date.now(),
        },
      };
    });
  }, [saveToHistory]);

  const handleConnectionDelete = useCallback((connectionId: string) => {
    saveToHistory();
    setStrategy((prev) => {
      if (!prev) return prev;

      // Find the connection to delete
      const connectionToDelete = prev.connections.find(conn => conn.id === connectionId);
      if (!connectionToDelete) return prev;

      const sourceId = connectionToDelete.source.blockId;
      const targetId = connectionToDelete.target.blockId;

      // Update block-level connections for non-START/END blocks
      const updatedBlocks = prev.blocks.map(block => {
        if (block.id === sourceId) {
          return {
            ...block,
            connections: {
              ...block.connections,
              outputs: block.connections.outputs.filter(id => id !== targetId),
            },
          };
        }
        if (block.id === targetId) {
          return {
            ...block,
            connections: {
              ...block.connections,
              inputs: block.connections.inputs.filter(id => id !== sourceId),
            },
          };
        }
        return block;
      });

      return {
        ...prev,
        blocks: updatedBlocks,
        connections: prev.connections.filter(conn => conn.id !== connectionId),
        metadata: {
          ...prev.metadata,
          updatedAt: Date.now(),
        },
      };
    });
  }, [saveToHistory]);

  const handleBlockDelete = useCallback((blockId: string) => {
    saveToHistory();
    setStrategy((prev) => {
      if (!prev) return prev;

      // Remove all connections involving this block
      const updatedConnections = prev.connections.filter(
        conn => conn.source.blockId !== blockId && conn.target.blockId !== blockId
      );

      // Update other blocks' connection arrays
      const updatedBlocks = prev.blocks
        .filter(block => block.id !== blockId)
        .map(block => ({
          ...block,
          connections: {
            inputs: block.connections.inputs.filter(id => id !== blockId),
            outputs: block.connections.outputs.filter(id => id !== blockId),
          },
        }));

      return {
        ...prev,
        blocks: updatedBlocks,
        connections: updatedConnections,
        metadata: {
          ...prev.metadata,
          updatedAt: Date.now(),
        },
      };
    });

    // Deselect if deleted block was selected
    setSelectedBlockId(prev => prev === blockId ? null : prev);
  }, [saveToHistory]);

  const addBlock = useCallback((block: Block) => {
    saveToHistory();
    setStrategy((prev) => {
      if (!prev) {
        // Create new strategy if none exists
        const newStrategy: Strategy = {
          id: `strategy-${Date.now()}`,
          name: "Untitled Strategy",
          description: "",
          blocks: [block],
          connections: [],
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: "1.0",
          },
        };

        // If first block is ASSET, auto-connect from START
        if (block.type === BlockType.ASSET) {
          const startConnection: Connection = {
            id: `conn-start-${block.id}`,
            source: { blockId: "start-block", port: "output" },
            target: { blockId: block.id, port: "input" },
          };
          newStrategy.connections = [startConnection];
          newStrategy.blocks[0].connections.inputs = ["start-block"];
        }

        return newStrategy;
      }

      // Auto-connect START to new ASSET blocks
      if (block.type === BlockType.ASSET) {
        const startConnection: Connection = {
          id: `conn-start-${block.id}`,
          source: { blockId: "start-block", port: "output" },
          target: { blockId: block.id, port: "input" },
        };

        const blockWithConnection = {
          ...block,
          connections: {
            ...block.connections,
            inputs: ["start-block"],
          },
        };

        return {
          ...prev,
          blocks: [...prev.blocks, blockWithConnection],
          connections: [...prev.connections, startConnection],
          metadata: {
            ...prev.metadata,
            updatedAt: Date.now(),
          },
        };
      }

      return {
        ...prev,
        blocks: [...prev.blocks, block],
        metadata: {
          ...prev.metadata,
          updatedAt: Date.now(),
        },
      };
    });
  }, [saveToHistory]);

  const createDemoStrategy = useCallback(() => {
    const demoStrategy: Strategy = {
      id: `strategy-${Date.now()}`,
      name: "Demo Portfolio",
      description: "60% ETH, 40% USDC demo strategy",
      startBlockPosition: { x: 50, y: 200 },
      endBlockPosition: { x: 800, y: 200 },
      blocks: [
        {
          id: "asset-eth-1",
          type: BlockType.ASSET,
          position: { x: 400, y: 100 },
          size: { width: 200, height: 150 },
          data: {
            symbol: "ETH",
            name: "Ethereum",
            initialWeight: 60,
            icon: "💎",
          },
          connections: { inputs: ["start-block"], outputs: [] },
        },
        {
          id: "asset-usdc-1",
          type: BlockType.ASSET,
          position: { x: 400, y: 300 },
          size: { width: 200, height: 150 },
          data: {
            symbol: "USDC",
            name: "USD Coin",
            initialWeight: 40,
            icon: "💵",
          },
          connections: { inputs: ["start-block"], outputs: [] },
        },
      ],
      connections: [
        {
          id: "conn-start-eth",
          source: { blockId: "start-block", port: "output" },
          target: { blockId: "asset-eth-1", port: "input" },
        },
        {
          id: "conn-start-usdc",
          source: { blockId: "start-block", port: "output" },
          target: { blockId: "asset-usdc-1", port: "input" },
        },
      ],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: "1.0",
      },
    };

    setStrategy(demoStrategy);
  }, []);

  const clearStrategy = useCallback(() => {
    setStrategy(null);
    setSelectedBlockId(null);
  }, []);

  const resetCanvas = useCallback(() => {
    const emptyStrategy: Strategy = {
      id: `strategy-${Date.now()}`,
      name: "Untitled Strategy",
      description: "",
      blocks: [],
      connections: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: "1.0",
      },
    };
    setStrategy(emptyStrategy);
    setSelectedBlockId(null);
  }, []);

  const autoLayout = useCallback(() => {
    setStrategy((prev) => {
      if (!prev) return prev;

      // Group blocks by type
      const assetBlocks = prev.blocks.filter(b => b.type === BlockType.ASSET);
      const conditionBlocks = prev.blocks.filter(b => b.type === BlockType.CONDITION);
      const actionBlocks = prev.blocks.filter(b => b.type === BlockType.ACTION);
      const triggerBlocks = prev.blocks.filter(b => b.type === BlockType.TRIGGER);

      // Layout configuration
      const startX = 50;
      const columnSpacing = 350;
      const rowSpacing = 200;
      const startY = 150;
      const BLOCK_WIDTH = 200;

      // If no blocks exist, place START and END close together
      if (prev.blocks.length === 0) {
        return {
          ...prev,
          startBlockPosition: { x: startX, y: 200 },
          endBlockPosition: { x: startX + 400, y: 200 },
          metadata: {
            ...prev.metadata,
            updatedAt: Date.now(),
          },
        };
      }

      // Calculate center Y for START and END blocks
      const maxBlocks = Math.max(
        assetBlocks.length,
        conditionBlocks.length,
        actionBlocks.length,
        triggerBlocks.length
      );
      const centerY = startY + ((maxBlocks - 1) * rowSpacing) / 2;

      let layoutBlocks = [...prev.blocks];
      let currentColumn = 0;
      let rightmostX = startX;

      // Helper to get next column X position
      const getColumnX = () => {
        currentColumn++;
        return startX + columnSpacing * currentColumn;
      };

      // Layout Asset blocks if they exist
      if (assetBlocks.length > 0) {
        const columnX = getColumnX();
        assetBlocks.forEach((block, index) => {
          const blockIndex = layoutBlocks.findIndex(b => b.id === block.id);
          if (blockIndex !== -1) {
            layoutBlocks[blockIndex] = {
              ...layoutBlocks[blockIndex],
              position: {
                x: columnX,
                y: startY + (index * rowSpacing),
              },
            };
          }
        });
        rightmostX = columnX + BLOCK_WIDTH;
      }

      // Layout Condition blocks if they exist
      if (conditionBlocks.length > 0) {
        const columnX = getColumnX();
        conditionBlocks.forEach((block, index) => {
          const blockIndex = layoutBlocks.findIndex(b => b.id === block.id);
          if (blockIndex !== -1) {
            layoutBlocks[blockIndex] = {
              ...layoutBlocks[blockIndex],
              position: {
                x: columnX,
                y: startY + (index * rowSpacing),
              },
            };
          }
        });
        rightmostX = columnX + BLOCK_WIDTH;
      }

      // Layout Action blocks if they exist
      if (actionBlocks.length > 0) {
        const columnX = getColumnX();
        actionBlocks.forEach((block, index) => {
          const blockIndex = layoutBlocks.findIndex(b => b.id === block.id);
          if (blockIndex !== -1) {
            layoutBlocks[blockIndex] = {
              ...layoutBlocks[blockIndex],
              position: {
                x: columnX,
                y: startY + (index * rowSpacing),
              },
            };
          }
        });
        rightmostX = columnX + BLOCK_WIDTH;
      }

      // Layout Trigger blocks if they exist
      if (triggerBlocks.length > 0) {
        const columnX = getColumnX();
        triggerBlocks.forEach((block, index) => {
          const blockIndex = layoutBlocks.findIndex(b => b.id === block.id);
          if (blockIndex !== -1) {
            layoutBlocks[blockIndex] = {
              ...layoutBlocks[blockIndex],
              position: {
                x: columnX,
                y: startY + (index * rowSpacing),
              },
            };
          }
        });
        rightmostX = columnX + BLOCK_WIDTH;
      }

      // Place END block after the rightmost block
      const endX = rightmostX + columnSpacing;

      return {
        ...prev,
        blocks: layoutBlocks,
        startBlockPosition: { x: startX, y: centerY },
        endBlockPosition: { x: endX, y: centerY },
        metadata: {
          ...prev.metadata,
          updatedAt: Date.now(),
        },
      };
    });
  }, []);

  return {
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
    addBlock,
    createDemoStrategy,
    clearStrategy,
    resetCanvas,
    autoLayout,
    handleUndo,
    handleRedo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
  };
}

import React from "react";
import { Block, BlockType } from "@/lib/types/blocks";
import { Connection } from "@/lib/types/strategy";
import { Clock, Wallet, GitBranch, Zap, Play, CheckCircle2 } from "lucide-react";

interface WorkflowVisualizationProps {
  blocks: Block[];
  connections: Connection[];
  className?: string;
}

const blockIcons = {
  [BlockType.TRIGGER]: Clock,
  [BlockType.ASSET]: Wallet,
  [BlockType.CONDITION]: GitBranch,
  [BlockType.ACTION]: Zap,
  "start": Play,
  "end": CheckCircle2,
};

interface BlockNode {
  block: Block | { id: string; type: string; data?: any };
  x: number;
  y: number;
}

export function WorkflowVisualization({ blocks, connections: strategyConnections, className = "" }: WorkflowVisualizationProps) {
  const BLOCK_SIZE = 80;
  const HORIZONTAL_GAP = 200;
  const VERTICAL_GAP = 140;

  // Organize blocks by type
  const triggers = blocks.filter(b => b.type === BlockType.TRIGGER);
  const assets = blocks.filter(b => b.type === BlockType.ASSET);
  const conditions = blocks.filter(b => b.type === BlockType.CONDITION);
  const actions = blocks.filter(b => b.type === BlockType.ACTION);

  // Position blocks in columns
  const positionBlocks = (): BlockNode[] => {
    const positioned: BlockNode[] = [];
    let columnX = 80;

    const addColumn = (columnBlocks: (Block | { id: string; type: string; data?: any })[]) => {
      const startY = 60;
      columnBlocks.forEach((block, i) => {
        positioned.push({
          block,
          x: columnX,
          y: startY + (i * VERTICAL_GAP),
        });
      });
      columnX += HORIZONTAL_GAP;
    };

    // Add START block as first column
    addColumn([{ id: "start-block", type: "start" }]);

    if (triggers.length > 0) addColumn(triggers);
    if (assets.length > 0) addColumn(assets);
    if (conditions.length > 0) addColumn(conditions);
    if (actions.length > 0) addColumn(actions);

    // Add END block as last column
    addColumn([{ id: "end-block", type: "end" }]);

    return positioned;
  };

  const nodes = positionBlocks();

  // Use actual strategy connections
  const connections = strategyConnections
    .map(conn => {
      const fromNode = nodes.find(n => n.block.id === conn.source.blockId);
      const toNode = nodes.find(n => n.block.id === conn.target.blockId);

      if (fromNode && toNode) {
        return { from: fromNode, to: toNode };
      }
      return null;
    })
    .filter(Boolean) as Array<{ from: BlockNode; to: BlockNode }>;

  // Create curved path
  const createCurvedPath = (from: BlockNode, to: BlockNode) => {
    const x1 = from.x + BLOCK_SIZE;
    const y1 = from.y + BLOCK_SIZE / 2;
    const x2 = to.x;
    const y2 = to.y + BLOCK_SIZE / 2;

    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  };

  if (nodes.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
          <GitBranch className="w-6 h-6 text-gray-400" />
        </div>
        <div className="text-sm text-gray-500">No blocks in workflow</div>
      </div>
    );
  };

  const maxX = Math.max(...nodes.map(n => n.x)) + BLOCK_SIZE + 100;
  const maxY = Math.max(...nodes.map(n => n.y)) + BLOCK_SIZE + 80;

  return (
    <div className={`relative bg-white ${className}`}>

      {/* SVG Canvas */}
      <svg
        width="100%"
        height={maxY}
        viewBox={`0 0 ${maxX} ${maxY}`}
        className="overflow-visible bg-white"
      >
        {/* Connection Lines */}
        {connections.map((conn, i) => (
          <path
            key={i}
            d={createCurvedPath(conn.from, conn.to)}
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}

        {/* Blocks */}
        {nodes.map(({ block, x, y }) => {
          let label = "";
          let typeLabel = "";

          if (block.type === "start") {
            label = "START";
            typeLabel = "Entry";
          } else if (block.type === "end") {
            label = "END";
            typeLabel = "Result";
          } else if (block.type === BlockType.ASSET) {
            label = (block as Block).data.symbol || "Asset";
            typeLabel = "asset";
          } else if (block.type === BlockType.TRIGGER) {
            label = (block as Block).data.triggerType || "Trigger";
            typeLabel = "trigger";
          } else if (block.type === BlockType.CONDITION) {
            label = (block as Block).data.operator || "Condition";
            typeLabel = "condition";
          } else if (block.type === BlockType.ACTION) {
            label = (block as Block).data.actionType || "Action";
            typeLabel = "action";
          }

          const IconComponent = blockIcons[block.type as keyof typeof blockIcons];

          return (
            <g key={block.id}>
              {/* White rounded rectangle block */}
              <rect
                x={x}
                y={y}
                width={BLOCK_SIZE}
                height={BLOCK_SIZE}
                rx="12"
                fill="white"
                stroke={block.type === "start" || block.type === "end" ? "#6B7280" : "#D1D5DB"}
                strokeWidth={block.type === "start" || block.type === "end" ? "2.5" : "2"}
                filter="drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))"
              />

              {/* Icon background */}
              <rect
                x={x + BLOCK_SIZE / 2 - 16}
                y={y + BLOCK_SIZE / 2 - 16}
                width="32"
                height="32"
                rx="6"
                fill={block.type === "start" || block.type === "end" ? "#1F2937" : "#F3F4F6"}
              />

              {/* Icon using foreignObject */}
              <foreignObject
                x={x + BLOCK_SIZE / 2 - 12}
                y={y + BLOCK_SIZE / 2 - 12}
                width="24"
                height="24"
              >
                <div className="flex items-center justify-center w-full h-full">
                  {IconComponent && <IconComponent className={`w-4 h-4 ${block.type === "start" || block.type === "end" ? "text-white" : "text-gray-700"}`} />}
                </div>
              </foreignObject>

              {/* Label below block */}
              <text
                x={x + BLOCK_SIZE / 2}
                y={y + BLOCK_SIZE + 18}
                textAnchor="middle"
                className="fill-gray-700 text-xs font-medium"
              >
                {label}
              </text>
              <text
                x={x + BLOCK_SIZE / 2}
                y={y + BLOCK_SIZE + 32}
                textAnchor="middle"
                className="fill-gray-400 text-[10px] uppercase tracking-wider"
              >
                {typeLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

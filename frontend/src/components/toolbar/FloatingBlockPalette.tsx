import React from "react";
import { BlockType } from "@/lib/types/blocks";
import { Clock, Wallet, GitBranch, Zap } from "lucide-react";

interface FloatingBlockPaletteProps {
  onBlockAdd: (type: BlockType) => void;
}

export function FloatingBlockPalette({ onBlockAdd }: FloatingBlockPaletteProps) {
  const blocks = [
    { type: BlockType.ASSET, icon: Wallet, label: "Asset" },
    { type: BlockType.CONDITION, icon: GitBranch, label: "Condition" },
    { type: BlockType.ACTION, icon: Zap, label: "Action" },
    { type: BlockType.TRIGGER, icon: Clock, label: "Trigger" },
  ];

  return (
    <div className="absolute top-5 left-5 z-50">
      <div className="bg-white rounded-lg shadow-md border border-gray-300 px-1.5 py-1.5 flex items-center gap-1">
        {blocks.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.type}
              onClick={() => onBlockAdd(block.type)}
              className="
                px-3 py-2 rounded
                text-sm font-medium text-gray-700
                transition-all duration-200
                hover:bg-gray-100
                active:scale-95
                flex items-center gap-1.5
              "
            >
              <Icon className="w-4 h-4" />
              {block.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

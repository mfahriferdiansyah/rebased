import React, { useState } from "react";
import { WorkflowVisualization } from "./WorkflowVisualization";
import { Strategy } from "@/lib/types/strategy";
import { Button } from "@/components/ui/button";
import { X, Workflow } from "lucide-react";

interface FloatingWorkflowPanelProps {
  strategy: Strategy | null;
}

export function FloatingWorkflowPanel({ strategy }: FloatingWorkflowPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!strategy) return null;

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-40 rounded-lg px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 shadow-lg transition-all duration-200"
        size="sm"
      >
        <Workflow className="w-4 h-4 mr-2 text-gray-700" />
        <span className="font-semibold text-gray-900">Strategy Preview</span>
      </Button>

      {/* Floating Panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-6 z-50 w-[700px] bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-white">
            <h3 className="text-sm font-bold text-gray-900">
              {strategy.name || "Strategy Preview"}
            </h3>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="rounded hover:bg-gray-100 h-7 w-7"
            >
              <X className="w-4 h-4 text-gray-700" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-white p-4">
            <WorkflowVisualization blocks={strategy.blocks} connections={strategy.connections} />
          </div>

          {/* Footer Stats */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-300 flex gap-4 text-xs">
            <span className="text-gray-700 font-medium">
              {strategy.blocks.filter(b => b.type === "trigger").length} Triggers
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-700 font-medium">
              {strategy.blocks.filter(b => b.type === "asset").length} Assets
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-700 font-medium">
              {strategy.blocks.filter(b => b.type === "condition").length} Conditions
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-700 font-medium">
              {strategy.blocks.filter(b => b.type === "action").length} Actions
            </span>
          </div>
        </div>
      )}
    </>
  );
}

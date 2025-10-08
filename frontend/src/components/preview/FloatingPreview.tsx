import React, { useState } from "react";
import { StrategyPreview } from "./StrategyPreview";
import { Strategy } from "@/lib/types/strategy";
import { Button } from "@/components/ui/button";
import { X, FileText } from "lucide-react";

interface FloatingPreviewProps {
  strategy: Strategy | null;
  selectedBlockId?: string | null;
}

export function FloatingPreview({ strategy, selectedBlockId }: FloatingPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!strategy) return null;

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 rounded-lg px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 shadow-lg transition-all duration-200"
        variant="ghost"
      >
        <FileText className="w-4 h-4 mr-2 text-gray-700" />
        <span className="text-sm font-medium text-gray-900">Preview</span>
      </Button>

      {/* Floating Panel */}
      {isOpen && (
        <div className="fixed right-6 bottom-20 z-50 w-96 bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-700" />
              <h3 className="text-sm font-semibold text-gray-900">Strategy Preview</h3>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="rounded hover:bg-gray-100 h-7 w-7"
            >
              <X className="w-4 h-4 text-gray-700" />
            </Button>
          </div>

          {/* Preview Content */}
          <div className="max-h-[600px] overflow-y-auto">
            <StrategyPreview strategy={strategy} selectedBlockId={selectedBlockId} />
          </div>
        </div>
      )}
    </>
  );
}

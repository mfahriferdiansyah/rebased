import React, { useRef } from "react";
import { Strategy } from "@/lib/types/strategy";
import { loadJSONFile } from "@/lib/utils/serialization";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ToolbarProps {
  strategy: Strategy | null;
  onStrategyLoad: (strategy: Strategy) => void;
  onClear: () => void;
}

export function Toolbar({ strategy, onStrategyLoad, onClear }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const loadedStrategy = await loadJSONFile(file);
      onStrategyLoad(loadedStrategy);
      toast.success(`Strategy "${loadedStrategy.name}" loaded successfully`);
    } catch (error) {
      console.error("Failed to load strategy:", error);
      toast.error("Failed to load strategy file");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    if (strategy) {
      if (confirm("Are you sure you want to clear the current strategy?")) {
        onClear();
        toast.info("Strategy cleared");
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button variant="outline" size="sm" onClick={handleImport}>
        <Upload className="w-4 h-4 mr-1" />
        Import
      </Button>

      {strategy && (
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

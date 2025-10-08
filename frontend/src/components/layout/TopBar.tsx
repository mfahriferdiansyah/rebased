import React, { useRef } from "react";
import { Strategy } from "@/lib/types/strategy";
import { loadJSONFile, downloadJSON } from "@/lib/utils/serialization";
import { Button } from "@/components/ui/button";
import { Upload, Download, Rocket, Target } from "lucide-react";
import { toast } from "sonner";

interface TopBarProps {
  strategy: Strategy | null;
  onStrategyLoad: (strategy: Strategy) => void;
  onDeploy?: () => void;
}

export function TopBar({ strategy, onStrategyLoad, onDeploy }: TopBarProps) {
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    if (strategy) {
      downloadJSON(strategy);
      toast.success("Strategy exported successfully");
    }
  };

  return (
    <div className="h-14 bg-white border-b border-gray-300 px-6 flex items-center justify-between">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gray-900 rounded flex items-center justify-center">
          <Target className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">
          Rebased
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleImport}
          className="rounded hover:bg-gray-100 text-gray-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>

        {strategy && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="rounded hover:bg-gray-100 text-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}

        {strategy && onDeploy && (
          <Button
            size="sm"
            onClick={onDeploy}
            className="
              rounded
              bg-gray-900
              text-white font-semibold
              hover:bg-gray-800
              transition-all duration-200
            "
          >
            <Rocket className="w-4 h-4 mr-2" />
            Deploy
          </Button>
        )}
      </div>
    </div>
  );
}

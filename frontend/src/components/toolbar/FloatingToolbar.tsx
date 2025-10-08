import React, { useRef, useState } from "react";
import { BlockType } from "@/lib/types/blocks";
import { Strategy } from "@/lib/types/strategy";
import { loadJSONFile, downloadJSON } from "@/lib/utils/serialization";
import { Clock, Wallet, GitBranch, Zap, Upload, Download, Target, Trash2, Sparkles, Menu, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MainMenuModal } from "@/components/layout/MainMenuModal";

interface FloatingToolbarProps {
  strategy: Strategy | null;
  onBlockAdd: (type: BlockType) => void;
  onStrategyLoad: (strategy: Strategy) => void;
  onReset: () => void;
  onAutoLayout: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function FloatingToolbar({ strategy, onBlockAdd, onStrategyLoad, onReset, onAutoLayout, onUndo, onRedo, canUndo, canRedo }: FloatingToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);

  const blocks = [
    { type: BlockType.ASSET, icon: Wallet, label: "Asset" },
    { type: BlockType.CONDITION, icon: GitBranch, label: "Condition" },
    { type: BlockType.ACTION, icon: Zap, label: "Action" },
    { type: BlockType.TRIGGER, icon: Clock, label: "Trigger" },
  ];

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

  const handleResetConfirm = () => {
    onReset();
    setShowResetDialog(false);
    toast.info("Canvas reset successfully");
  };

  const handleAutoLayout = () => {
    onAutoLayout();
    toast.success("Blocks arranged automatically");
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white rounded-lg shadow-lg border border-gray-300 px-3 py-2.5 flex items-center gap-3 min-w-max">
          {/* Menu Button */}
          <button
            onClick={() => setShowMainMenu(true)}
            className="
              p-1.5 rounded
              text-gray-700
              transition-all duration-200
              hover:bg-gray-100
              active:scale-95
            "
            title="Main Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Logo + Name */}
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="flex items-center gap-2 pr-3 border-r border-gray-300 hover:opacity-80 active:scale-95 transition-all duration-200"
            title="Go to Home"
          >
            <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Rebased</span>
          </button>

          {/* Block Tools */}
          <div className="flex items-center gap-1">
            {blocks.map((block) => {
              const Icon = block.icon;
              return (
                <button
                  key={block.type}
                  onClick={() => onBlockAdd(block.type)}
                  className="
                    px-2.5 py-1.5 rounded
                    text-xs font-medium text-gray-700
                    transition-all duration-200
                    hover:bg-gray-100
                    active:scale-95
                    flex items-center gap-1.5
                  "
                  title={`Add ${block.label}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{block.label}</span>
                </button>
              );
            })}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="
                px-2.5 py-1.5 rounded
                text-xs font-medium text-gray-700
                transition-all duration-200
                hover:bg-gray-100
                active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                flex items-center gap-1.5
              "
              title="Undo (⌘Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="
                px-2.5 py-1.5 rounded
                text-xs font-medium text-gray-700
                transition-all duration-200
                hover:bg-gray-100
                active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                flex items-center gap-1.5
              "
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>Redo</span>
            </button>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Import/Export/Reset */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleImport}
              className="
                px-2.5 py-1.5 rounded
                text-xs font-medium text-gray-700
                transition-all duration-200
                hover:bg-gray-100
                active:scale-95
                flex items-center gap-1.5
              "
              title="Import Strategy"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>

            {strategy && (
              <>
                <button
                  onClick={handleExport}
                  className="
                    px-2.5 py-1.5 rounded
                    text-xs font-medium text-gray-700
                    transition-all duration-200
                    hover:bg-gray-100
                    active:scale-95
                    flex items-center gap-1.5
                  "
                  title="Export Strategy"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  onClick={handleAutoLayout}
                  className="
                    px-2.5 py-1.5 rounded
                    text-xs font-medium text-gray-700
                    transition-all duration-200
                    hover:bg-gray-100
                    active:scale-95
                    flex items-center gap-1.5
                  "
                  title="Auto Layout"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tidy Up</span>
                </button>

                <button
                  onClick={() => setShowResetDialog(true)}
                  className="
                    px-2.5 py-1.5 rounded
                    text-xs font-medium text-gray-700
                    transition-all duration-200
                    hover:bg-gray-100
                    active:scale-95
                    flex items-center gap-1.5
                  "
                  title="Reset Canvas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-gray-700" />
              Reset Canvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the canvas? All blocks and connections will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetConfirm}
              className="bg-gray-900 hover:bg-gray-800 focus:ring-gray-900"
            >
              Reset Canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Menu Modal */}
      <MainMenuModal open={showMainMenu} onOpenChange={setShowMainMenu} onStrategyLoad={onStrategyLoad} />
    </>
  );
}

import { Button } from "@/components/ui/button";
import { MousePointer2, Pencil, Square, Circle, Minus, Trash2, Undo, ZoomIn, ZoomOut, Maximize2, Grid3x3, Hand } from "lucide-react";
import { Tool } from "./DrawingCanvas";

interface ToolbarProps {
  activeTool: Tool;
  onToolClick: (tool: Tool) => void;
  onClear: () => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleGrid: () => void;
  showGrid: boolean;
  zoom: number;
}

export const Toolbar = ({ 
  activeTool, 
  onToolClick, 
  onClear, 
  onUndo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleGrid,
  showGrid,
  zoom
}: ToolbarProps) => {
  const tools = [
    { id: "select" as Tool, icon: MousePointer2, label: "Select" },
    { id: "pan" as Tool, icon: Hand, label: "Pan" },
    { id: "draw" as Tool, icon: Pencil, label: "Draw" },
    { id: "rectangle" as Tool, icon: Square, label: "Rectangle" },
    { id: "circle" as Tool, icon: Circle, label: "Circle" },
    { id: "line" as Tool, icon: Minus, label: "Line" },
  ];

  return (
    <div className="flex items-center gap-2">
      {/* Drawing Tools */}
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onToolClick(tool.id)}
              className="h-8 w-8 p-0"
              title={tool.label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          className="h-8 w-8 p-0"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          title="Clear All"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          className="h-8 w-8 p-0"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetZoom}
          className="h-8 px-2 min-w-[3rem] text-xs font-medium"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          className="h-8 w-8 p-0"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* View Options */}
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-1">
        <Button
          variant={showGrid ? "default" : "ghost"}
          size="sm"
          onClick={onToggleGrid}
          className="h-8 w-8 p-0"
          title="Toggle Grid"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

import React from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onZoomReset }: ZoomControlsProps) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 right-5 z-50"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-2 flex flex-col gap-1">
        <button
          onClick={onZoomIn}
          className="
            p-2 rounded
            text-gray-700
            transition-all duration-200
            hover:bg-gray-100
            active:scale-95
          "
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="text-xs font-medium text-gray-600 text-center py-1">
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={onZoomOut}
          className="
            p-2 rounded
            text-gray-700
            transition-all duration-200
            hover:bg-gray-100
            active:scale-95
          "
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-gray-300 my-1" />

        <button
          onClick={onZoomReset}
          className="
            p-2 rounded
            text-gray-700
            transition-all duration-200
            hover:bg-gray-100
            active:scale-95
          "
          title="Reset Zoom"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

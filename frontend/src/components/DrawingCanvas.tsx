import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, PencilBrush } from "fabric";
import { Toolbar } from "./Toolbar";
import { ColorPicker } from "./ColorPicker";
import { ChatInterface } from "./ChatInterface";
import { HistorySidebar } from "./HistorySidebar";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  messages: Message[];
  timestamp: Date;
  preview: string;
}

export type Tool = "select" | "draw" | "rectangle" | "circle" | "line" | "pan";

export const DrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#3B82F6");
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#ffffff",
    });

    // Initialize the freeDrawingBrush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = 2;

    setFabricCanvas(canvas);
    toast.success("Canvas ready! Start creating!");

    // Handle window resize
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 2;
    }

    // Disable selection for drawing modes
    if (activeTool !== "select") {
      fabricCanvas.selection = false;
      fabricCanvas.forEachObject((obj) => {
        obj.selectable = false;
      });
    } else {
      fabricCanvas.selection = true;
      fabricCanvas.forEachObject((obj) => {
        obj.selectable = true;
      });
    }
  }, [activeTool, activeColor, fabricCanvas]);

  const handleToolClick = (tool: Tool) => {
    if (!fabricCanvas) return;
    setActiveTool(tool);

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: activeColor,
        strokeWidth: 2,
        width: 100,
        height: 100,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      setActiveTool("select");
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: activeColor,
        strokeWidth: 2,
        radius: 50,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
      setActiveTool("select");
    }
  };

  // Handle line drawing
  useEffect(() => {
    if (!fabricCanvas || activeTool !== "line") return;

    const handleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getPointer(e.e);
      lineStartRef.current = { x: pointer.x, y: pointer.y };
      setIsDrawing(true);
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawing || !lineStartRef.current) return;
      
      const pointer = fabricCanvas.getPointer(e.e);
      
      // Remove temporary line if exists
      const objects = fabricCanvas.getObjects();
      const tempLine = objects.find((obj: any) => obj.tempLine);
      if (tempLine) {
        fabricCanvas.remove(tempLine);
      }

      // Draw temporary line
      const line = new Line(
        [lineStartRef.current.x, lineStartRef.current.y, pointer.x, pointer.y],
        {
          stroke: activeColor,
          strokeWidth: 2,
          selectable: false,
        }
      );
      (line as any).tempLine = true;
      fabricCanvas.add(line);
      fabricCanvas.renderAll();
    };

    const handleMouseUp = (e: any) => {
      if (!isDrawing || !lineStartRef.current) return;
      
      const pointer = fabricCanvas.getPointer(e.e);
      
      // Remove temporary line
      const objects = fabricCanvas.getObjects();
      const tempLine = objects.find((obj: any) => obj.tempLine);
      if (tempLine) {
        fabricCanvas.remove(tempLine);
      }

      // Add final line
      const line = new Line(
        [lineStartRef.current.x, lineStartRef.current.y, pointer.x, pointer.y],
        {
          stroke: activeColor,
          strokeWidth: 2,
        }
      );
      fabricCanvas.add(line);
      
      setIsDrawing(false);
      lineStartRef.current = null;
      setActiveTool("select");
    };

    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
    fabricCanvas.on("mouse:up", handleMouseUp);

    return () => {
      fabricCanvas.off("mouse:down", handleMouseDown);
      fabricCanvas.off("mouse:move", handleMouseMove);
      fabricCanvas.off("mouse:up", handleMouseUp);
    };
  }, [fabricCanvas, activeTool, activeColor, isDrawing]);

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast.success("Canvas cleared!");
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      fabricCanvas.remove(objects[objects.length - 1]);
      toast.success("Undone!");
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 5);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleResetZoom = () => {
    if (!fabricCanvas) return;
    setZoom(1);
    fabricCanvas.setZoom(1);
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabricCanvas.renderAll();
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  const handleSaveToHistory = (messages: Message[]) => {
    if (messages.length === 0) return;
    
    const userMessages = messages.filter(m => m.role === "user");
    const preview = userMessages[0]?.content || "New conversation";
    
    const newSession: ChatSession = {
      id: Date.now().toString(),
      messages,
      timestamp: new Date(),
      preview,
    };

    setChatSessions((prev) => [newSession, ...prev]);
  };

  const handleClearHistory = () => {
    setChatSessions([]);
    toast.success("Chat history cleared!");
  };

  const handleLoadSession = (session: ChatSession) => {
    toast.info(`Loaded conversation: ${session.preview}`);
  };

  // Handle panning
  useEffect(() => {
    if (!fabricCanvas || activeTool !== "pan") return;

    const handleMouseDown = (e: any) => {
      isPanningRef.current = true;
      const pointer = fabricCanvas.getPointer(e.e);
      lastPosRef.current = { x: pointer.x, y: pointer.y };
    };

    const handleMouseMove = (e: any) => {
      if (!isPanningRef.current) return;
      
      const pointer = fabricCanvas.getPointer(e.e);
      const vpt = fabricCanvas.viewportTransform;
      if (vpt) {
        vpt[4] += pointer.x - lastPosRef.current.x;
        vpt[5] += pointer.y - lastPosRef.current.y;
        fabricCanvas.requestRenderAll();
      }
    };

    const handleMouseUp = () => {
      isPanningRef.current = false;
    };

    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
    fabricCanvas.on("mouse:up", handleMouseUp);

    return () => {
      fabricCanvas.off("mouse:down", handleMouseDown);
      fabricCanvas.off("mouse:move", handleMouseMove);
      fabricCanvas.off("mouse:up", handleMouseUp);
    };
  }, [fabricCanvas, activeTool]);

  // Draw grid
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const drawGrid = () => {
      const ctx = fabricCanvas.getContext();
      const zoom = fabricCanvas.getZoom();
      const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      
      if (!showGrid) {
        fabricCanvas.renderAll();
        return;
      }

      ctx.save();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1 / zoom;

      const gridSize = 20;
      const width = fabricCanvas.width || 0;
      const height = fabricCanvas.height || 0;

      const startX = Math.floor((-vpt[4] / zoom) / gridSize) * gridSize;
      const startY = Math.floor((-vpt[5] / zoom) / gridSize) * gridSize;
      const endX = Math.ceil((width / zoom - vpt[4] / zoom) / gridSize) * gridSize;
      const endY = Math.ceil((height / zoom - vpt[5] / zoom) / gridSize) * gridSize;

      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }

      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      ctx.restore();
    };

    fabricCanvas.on("after:render", drawGrid);
    fabricCanvas.renderAll();

    return () => {
      fabricCanvas.off("after:render", drawGrid);
    };
  }, [fabricCanvas, showGrid, zoom]);

  return (
    <div className="relative h-screen w-screen bg-muted overflow-hidden">
      {/* Canvas - Lowest z-index for grid to appear behind */}
      <div className="absolute inset-0 z-0">
        <canvas ref={canvasRef} />
      </div>

      {/* History Sidebar */}
      <HistorySidebar 
        sessions={chatSessions}
        onClearHistory={handleClearHistory}
        onLoadSession={handleLoadSession}
      />

      {/* Floating Menu Island */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-3">
        <Toolbar 
          activeTool={activeTool} 
          onToolClick={handleToolClick} 
          onClear={handleClear}
          onUndo={handleUndo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onToggleGrid={toggleGrid}
          showGrid={showGrid}
          zoom={zoom}
        />
        <div className="w-px h-8 bg-border" />
        <ColorPicker color={activeColor} onChange={setActiveColor} />
      </div>

      {/* AI Chat Interface */}
      <ChatInterface onSaveToHistory={handleSaveToHistory} />
    </div>
  );
};

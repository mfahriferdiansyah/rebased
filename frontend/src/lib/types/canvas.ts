export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DragState {
  blockId: string | null;
  offset: { x: number; y: number };
}

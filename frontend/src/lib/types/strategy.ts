import { Block } from "./blocks";

export interface Strategy {
  id: string;
  name: string;
  description: string;
  blocks: Block[];
  connections: Connection[];
  startBlockPosition?: { x: number; y: number };
  endBlockPosition?: { x: number; y: number };
  metadata: {
    createdAt: number;
    updatedAt: number;
    version: string;
  };
}

export interface Connection {
  id: string;
  source: {
    blockId: string;
    port: "output";
  };
  target: {
    blockId: string;
    port: "input";
  };
  style?: {
    color?: string;
    width?: number;
    animated?: boolean;
  };
}

export interface StrategyJSON {
  version: "1.0";
  strategy: Strategy;
}

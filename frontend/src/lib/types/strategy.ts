/**
 * Canvas Strategy Types
 * Different from API Strategy types - these represent the visual canvas state
 */

import { Block } from './blocks';

export interface Connection {
  id: string;
  source: {
    blockId: string;
    port: string;
  };
  target: {
    blockId: string;
    port: string;
  };
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  blocks: Block[];
  connections: Connection[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    version: string;
  };
  startBlockPosition?: { x: number; y: number };
  endBlockPosition?: { x: number; y: number };
}

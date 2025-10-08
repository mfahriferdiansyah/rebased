import { Block, BlockType } from "../types/blocks";

/**
 * Validates if two blocks can be connected
 * Connection rules from README:
 * - START → [ASSET, TRIGGER]
 * - ASSET → [CONDITION, ACTION, END]
 * - CONDITION → [ACTION, CONDITION]
 * - ACTION → [END, CONDITION]
 * - TRIGGER → [ASSET]
 */
export function canConnect(sourceBlock: Block | { id: string }, targetBlock: Block | { id: string }, blocks: Block[]): boolean {
  console.log(`\n🔍 VALIDATION: ${sourceBlock.id} → ${targetBlock.id}`);

  // Handle START block
  if (sourceBlock.id === "start-block") {
    const target = blocks.find(b => b.id === targetBlock.id);
    if (!target) {
      console.log(`❌ Target not found in blocks array`);
      return false;
    }
    const isValid = target.type === BlockType.ASSET || target.type === BlockType.TRIGGER;
    console.log(`START → ${target.type}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    return isValid;
  }

  // Handle END block
  if (targetBlock.id === "end-block") {
    const source = blocks.find(b => b.id === sourceBlock.id);
    if (!source) {
      console.log(`❌ Source not found in blocks array`);
      return false;
    }
    const isValid = source.type === BlockType.ASSET || source.type === BlockType.ACTION;
    console.log(`${source.type} → END: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    return isValid;
  }

  // Get actual block types
  const source = blocks.find(b => b.id === sourceBlock.id);
  const target = blocks.find(b => b.id === targetBlock.id);

  if (!source || !target) {
    console.log(`❌ Block not found - Source: ${!!source}, Target: ${!!target}`);
    return false;
  }

  console.log(`Source: ${source.type}, Target: ${target.type}`);

  // Define connection rules (matches README schema)
  const rules: Record<BlockType, BlockType[]> = {
    [BlockType.ASSET]: [BlockType.CONDITION, BlockType.ACTION],
    [BlockType.TRIGGER]: [BlockType.ASSET],
    [BlockType.CONDITION]: [BlockType.ACTION, BlockType.CONDITION],
    [BlockType.ACTION]: [BlockType.CONDITION],
  };

  const allowedTargets = rules[source.type] || [];
  const isValid = allowedTargets.includes(target.type);

  console.log(`${source.type} → ${target.type}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Allowed targets for ${source.type}: [${allowedTargets.join(', ')}]`);

  return isValid;
}

/**
 * Get the output port position for a block
 */
export function getOutputPortPosition(block: Block | { id: string; position: { x: number; y: number }; size: { width: number; height: number } }): { x: number; y: number } {
  return {
    x: block.position.x + block.size.width,
    y: block.position.y + block.size.height / 2,
  };
}

/**
 * Get the input port position for a block
 */
export function getInputPortPosition(block: Block | { id: string; position: { x: number; y: number }; size: { width: number; height: number } }): { x: number; y: number } {
  return {
    x: block.position.x,
    y: block.position.y + block.size.height / 2,
  };
}

/**
 * Find all blocks that can be connected FROM the selected block (output targets)
 */
export function getCompatibleTargets(sourceBlock: Block | { id: string }, blocks: Block[], includeEnd: boolean = true): string[] {
  const compatibleIds: string[] = [];

  // Check if source is START
  if (sourceBlock.id === "start-block") {
    blocks.forEach(block => {
      if (block.type === BlockType.ASSET || block.type === BlockType.TRIGGER) {
        compatibleIds.push(block.id);
      }
    });
    // START cannot connect directly to END
    return compatibleIds;
  }

  // Get source block from blocks array
  const source = blocks.find(b => b.id === sourceBlock.id);
  if (!source) return compatibleIds;

  // Define connection rules (matches README)
  const rules: Record<BlockType, BlockType[]> = {
    [BlockType.ASSET]: [BlockType.CONDITION, BlockType.ACTION],
    [BlockType.TRIGGER]: [BlockType.ASSET],
    [BlockType.CONDITION]: [BlockType.ACTION, BlockType.CONDITION],
    [BlockType.ACTION]: [BlockType.CONDITION],
  };

  const allowedTypes = rules[source.type] || [];

  blocks.forEach(block => {
    if (block.id !== source.id && allowedTypes.includes(block.type)) {
      compatibleIds.push(block.id);
    }
  });

  // ASSET and ACTION can connect to END
  if (includeEnd && (source.type === BlockType.ASSET || source.type === BlockType.ACTION)) {
    compatibleIds.push("end-block");
  }

  return compatibleIds;
}

/**
 * Find all blocks that can be connected TO the selected block (input sources)
 */
export function getCompatibleSources(targetBlock: Block | { id: string }, blocks: Block[], includeStart: boolean = true): string[] {
  const compatibleIds: string[] = [];

  // Check if target is END
  if (targetBlock.id === "end-block") {
    blocks.forEach(block => {
      if (block.type === BlockType.ASSET || block.type === BlockType.ACTION) {
        compatibleIds.push(block.id);
      }
    });
    return compatibleIds;
  }

  // Get target block from blocks array
  const target = blocks.find(b => b.id === targetBlock.id);
  if (!target) return compatibleIds;

  // Reverse lookup - what can connect TO this block type
  const reverseRules: Record<BlockType, BlockType[]> = {
    [BlockType.ASSET]: [BlockType.TRIGGER], // Assets receive from TRIGGER
    [BlockType.TRIGGER]: [], // Triggers can only connect from START
    [BlockType.CONDITION]: [BlockType.ASSET, BlockType.CONDITION],
    [BlockType.ACTION]: [BlockType.ASSET, BlockType.CONDITION],
  };

  const allowedTypes = reverseRules[target.type] || [];

  blocks.forEach(block => {
    if (block.id !== target.id && allowedTypes.includes(block.type)) {
      compatibleIds.push(block.id);
    }
  });

  // ASSET and TRIGGER can connect from START
  if (includeStart && (target.type === BlockType.ASSET || target.type === BlockType.TRIGGER)) {
    compatibleIds.push("start-block");
  }

  return compatibleIds;
}

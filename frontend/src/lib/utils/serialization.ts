import { Strategy, StrategyJSON } from "@/lib/types/strategy";
import { BlockType } from "@/lib/types/blocks";

export function serializeStrategy(strategy: Strategy): string {
  const json: StrategyJSON = {
    version: "1.0",
    strategy,
  };
  return JSON.stringify(json, null, 2);
}

export function deserializeStrategy(json: string): Strategy {
  const parsed: StrategyJSON = JSON.parse(json);

  if (parsed.version !== "1.0") {
    throw new Error(`Unsupported strategy version: ${parsed.version}`);
  }

  return parsed.strategy;
}

export function strategyToSolidity(strategy: Strategy): string {
  // Convert strategy to Solidity contract parameters
  const assetBlocks = strategy.blocks.filter((b) => b.type === BlockType.ASSET);

  const tokens = assetBlocks.map((b) => b.data.address || "0x0");
  const weights = assetBlocks.map((b) => b.data.initialWeight);

  return `
// Generated strategy contract deployment parameters
// Strategy: ${strategy.name}
// Description: ${strategy.description}

address[] memory tokens = new address[](${tokens.length});
uint256[] memory weights = new uint256[](${weights.length});

${tokens.map((addr, i) => `tokens[${i}] = ${addr};`).join("\n")}
${weights.map((w, i) => `weights[${i}] = ${w};`).join("\n")}

// Deploy
StrategyVault vault = new StrategyVault(tokens, weights);
  `.trim();
}

export function downloadJSON(strategy: Strategy) {
  const json = serializeStrategy(strategy);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${strategy.name.replace(/\s+/g, "-").toLowerCase()}-strategy.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function loadJSONFile(file: File): Promise<Strategy> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const strategy = deserializeStrategy(json);
        resolve(strategy);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

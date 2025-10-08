import { Strategy } from "@/lib/types/strategy";
import { BlockType } from "@/lib/types/blocks";

export type StrategyStatus = "draft" | "stopped" | "running";

export interface StrategyWithMetrics extends Strategy {
  status: StrategyStatus;
  metrics: {
    pnl: number; // Percentage
    pnlAbsolute: number; // Dollar amount
    totalValuation: number;
  };
}

export interface StrategyStatusConfig {
  icon: string;
  label: string;
}

export const statusConfig: Record<StrategyStatus, StrategyStatusConfig> = {
  draft: {
    icon: "draft",
    label: "Draft",
  },
  stopped: {
    icon: "paused",
    label: "Paused",
  },
  running: {
    icon: "active",
    label: "Active",
  },
};

export const mockStrategies: StrategyWithMetrics[] = [
  {
    id: "mock-strategy-1",
    name: "Balanced ETH/BTC",
    description: "A balanced portfolio strategy with 60% ETH and 40% BTC allocation",
    status: "running",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 200 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "ETH",
          name: "Ethereum",
          initialWeight: 60,
          icon: "⟠",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 350 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "BTC",
          name: "Bitcoin",
          initialWeight: 40,
          icon: "₿",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      version: "1.0",
    },
    metrics: {
      pnl: 12.5,
      pnlAbsolute: 6250,
      totalValuation: 50000,
    },
  },
  {
    id: "mock-strategy-2",
    name: "DeFi Growth",
    description: "Aggressive DeFi strategy targeting high growth tokens",
    status: "stopped",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 150 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "ETH",
          name: "Ethereum",
          initialWeight: 40,
          icon: "⟠",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 300 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "LINK",
          name: "Chainlink",
          initialWeight: 30,
          icon: "🔗",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-3",
        type: BlockType.ASSET,
        position: { x: 300, y: 450 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "AAVE",
          name: "Aave",
          initialWeight: 30,
          icon: "👻",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
      updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      version: "1.0",
    },
    metrics: {
      pnl: 28.3,
      pnlAbsolute: 21225,
      totalValuation: 75000,
    },
  },
  {
    id: "mock-strategy-3",
    name: "Conservative Stable",
    description: "Low-risk strategy with stablecoin dominance",
    status: "draft",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 200 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "USDC",
          name: "USD Coin",
          initialWeight: 70,
          icon: "💵",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 350 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "ETH",
          name: "Ethereum",
          initialWeight: 30,
          icon: "⟠",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
      version: "1.0",
    },
    metrics: {
      pnl: 4.2,
      pnlAbsolute: 4200,
      totalValuation: 100000,
    },
  },
  {
    id: "mock-strategy-4",
    name: "Layer 2 Focus",
    description: "Diversified portfolio focusing on Layer 2 scaling solutions",
    status: "running",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 150 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "MATIC",
          name: "Polygon",
          initialWeight: 35,
          icon: "🟣",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 300 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "ARB",
          name: "Arbitrum",
          initialWeight: 35,
          icon: "🔵",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-3",
        type: BlockType.ASSET,
        position: { x: 300, y: 450 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "OP",
          name: "Optimism",
          initialWeight: 30,
          icon: "🔴",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: 18.7,
      pnlAbsolute: 9350,
      totalValuation: 50000,
    },
  },
  {
    id: "mock-strategy-5",
    name: "Blue Chip Mix",
    description: "Traditional crypto blue chips with proven track records",
    status: "running",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 200 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "BTC",
          name: "Bitcoin",
          initialWeight: 50,
          icon: "₿",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 350 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "ETH",
          name: "Ethereum",
          initialWeight: 50,
          icon: "⟠",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: 8.9,
      pnlAbsolute: 8900,
      totalValuation: 100000,
    },
  },
  {
    id: "mock-strategy-6",
    name: "Yield Farming Pro",
    description: "Maximizing yields through strategic DeFi farming",
    status: "stopped",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 150 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "CRV",
          name: "Curve",
          initialWeight: 40,
          icon: "📈",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 300 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "AAVE",
          name: "Aave",
          initialWeight: 30,
          icon: "👻",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-3",
        type: BlockType.ASSET,
        position: { x: 300, y: 450 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "COMP",
          name: "Compound",
          initialWeight: 30,
          icon: "💚",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: -5.2,
      pnlAbsolute: -2600,
      totalValuation: 50000,
    },
  },
  {
    id: "mock-strategy-7",
    name: "Metaverse Exposure",
    description: "Portfolio focused on metaverse and gaming tokens",
    status: "draft",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 200 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "SAND",
          name: "The Sandbox",
          initialWeight: 40,
          icon: "🏖️",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 350 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "MANA",
          name: "Decentraland",
          initialWeight: 35,
          icon: "🌐",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-3",
        type: BlockType.ASSET,
        position: { x: 300, y: 500 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "AXS",
          name: "Axie Infinity",
          initialWeight: 25,
          icon: "🎮",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: -12.4,
      pnlAbsolute: -3720,
      totalValuation: 30000,
    },
  },
  {
    id: "mock-strategy-8",
    name: "AI Token Portfolio",
    description: "Investing in AI and machine learning blockchain projects",
    status: "running",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 200 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "FET",
          name: "Fetch.ai",
          initialWeight: 50,
          icon: "🤖",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 350 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "OCEAN",
          name: "Ocean Protocol",
          initialWeight: 50,
          icon: "🌊",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: 32.5,
      pnlAbsolute: 16250,
      totalValuation: 50000,
    },
  },
  {
    id: "mock-strategy-9",
    name: "Privacy Coins",
    description: "Focus on privacy-focused cryptocurrency projects",
    status: "stopped",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 200 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "XMR",
          name: "Monero",
          initialWeight: 60,
          icon: "🔒",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 350 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "ZEC",
          name: "Zcash",
          initialWeight: 40,
          icon: "🛡️",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: 2.1,
      pnlAbsolute: 1050,
      totalValuation: 50000,
    },
  },
  {
    id: "mock-strategy-10",
    name: "Staking Rewards",
    description: "Portfolio optimized for staking rewards and passive income",
    status: "running",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 150 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "ADA",
          name: "Cardano",
          initialWeight: 35,
          icon: "💎",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 300 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "DOT",
          name: "Polkadot",
          initialWeight: 35,
          icon: "⚫",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-3",
        type: BlockType.ASSET,
        position: { x: 300, y: 450 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "ATOM",
          name: "Cosmos",
          initialWeight: 30,
          icon: "⚛️",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: 15.3,
      pnlAbsolute: 11475,
      totalValuation: 75000,
    },
  },
  {
    id: "mock-strategy-11",
    name: "Web3 Infrastructure",
    description: "Investing in core Web3 infrastructure and protocols",
    status: "draft",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 200 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "FIL",
          name: "Filecoin",
          initialWeight: 40,
          icon: "📁",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 350 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "AR",
          name: "Arweave",
          initialWeight: 35,
          icon: "🗂️",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-3",
        type: BlockType.ASSET,
        position: { x: 300, y: 500 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "GRT",
          name: "The Graph",
          initialWeight: 25,
          icon: "📊",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: 6.8,
      pnlAbsolute: 3400,
      totalValuation: 50000,
    },
  },
  {
    id: "mock-strategy-12",
    name: "Exchange Tokens",
    description: "Portfolio of major exchange utility tokens",
    status: "running",
    blocks: [
      {
        id: "asset-1",
        type: BlockType.ASSET,
        position: { x: 300, y: 200 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "BNB",
          name: "Binance Coin",
          initialWeight: 50,
          icon: "🟡",
        },
        connections: { inputs: [], outputs: [] },
      },
      {
        id: "asset-2",
        type: BlockType.ASSET,
        position: { x: 300, y: 350 },
        size: { width: 200, height: 120 },
        data: {
          symbol: "UNI",
          name: "Uniswap",
          initialWeight: 50,
          icon: "🦄",
        },
        connections: { inputs: [], outputs: [] },
      },
    ],
    connections: [],
    metadata: {
      createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      version: "1.0",
    },
    metrics: {
      pnl: 21.4,
      pnlAbsolute: 16050,
      totalValuation: 75000,
    },
  },
];

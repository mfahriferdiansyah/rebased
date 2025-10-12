import { createConfig } from "@ponder/core";
import { http } from "viem";

import { StrategyRegistryAbi } from "./abis/StrategyRegistry";
import { RebalanceExecutorAbi } from "./abis/RebalanceExecutor";

export default createConfig({
  networks: {
    monad: {
      chainId: 10143,
      transport: http(process.env.PONDER_RPC_URL_MONAD),
    },
    baseSepolia: {
      chainId: 84532,
      transport: http(process.env.PONDER_RPC_URL_BASE),
    },
  },
  contracts: {
    StrategyRegistry: {
      abi: StrategyRegistryAbi,
      network: {
        monad: {
          address: process.env.MONAD_STRATEGY_REGISTRY as `0x${string}`,
          startBlock: parseInt(process.env.MONAD_START_BLOCK || "0"),
        },
        baseSepolia: {
          address: process.env.BASE_STRATEGY_REGISTRY as `0x${string}`,
          startBlock: parseInt(process.env.BASE_START_BLOCK || "0"),
        },
      },
    },
    RebalanceExecutor: {
      abi: RebalanceExecutorAbi,
      network: {
        monad: {
          address: process.env.MONAD_REBALANCE_EXECUTOR as `0x${string}`,
          startBlock: parseInt(process.env.MONAD_START_BLOCK || "0"),
        },
        baseSepolia: {
          address: process.env.BASE_REBALANCE_EXECUTOR as `0x${string}`,
          startBlock: parseInt(process.env.BASE_START_BLOCK || "0"),
        },
      },
    },
  },
  database: {
    kind: "postgres",
    connectionString: process.env.PONDER_DATABASE_URL,
  },
});

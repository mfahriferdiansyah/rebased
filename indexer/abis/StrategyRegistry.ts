export const StrategyRegistryAbi = [
  {
    type: "event",
    name: "StrategyCreated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "strategyId", type: "uint256", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "tokens", type: "address[]", indexed: false },
      { name: "weights", type: "uint256[]", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StrategyUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "strategyId", type: "uint256", indexed: true },
      { name: "tokens", type: "address[]", indexed: false },
      { name: "weights", type: "uint256[]", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StrategyPaused",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "strategyId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "StrategyResumed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "strategyId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "StrategyDeleted",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "strategyId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "LastRebalanceTimeUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "strategyId", type: "uint256", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RebalanceExecutorUpdated",
    inputs: [
      { name: "oldExecutor", type: "address", indexed: true },
      { name: "newExecutor", type: "address", indexed: true },
    ],
  },
] as const;

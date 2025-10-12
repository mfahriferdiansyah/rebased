export const RebalanceExecutorAbi = [
  {
    type: "event",
    name: "RebalanceExecuted",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "strategyId", type: "uint256", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "drift", type: "uint256", indexed: false },
      { name: "gasReimbursed", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RebalanceFailed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "strategyId", type: "uint256", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SwapExecuted",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "tokenIn", type: "address", indexed: false },
      { name: "tokenOut", type: "address", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DEXApprovalUpdated",
    inputs: [
      { name: "dex", type: "address", indexed: true },
      { name: "approved", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EmergencyPaused",
    inputs: [{ name: "caller", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "EmergencyUnpaused",
    inputs: [{ name: "caller", type: "address", indexed: true }],
  },
] as const;

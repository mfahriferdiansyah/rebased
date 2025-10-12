import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
  /**
   * User - Portfolio owner account
   */
  User: p.createTable({
    id: p.hex(),  // User's Ethereum address
    strategyCount: p.int().default(0),
    totalRebalances: p.int().default(0),
    totalVolumeUSD: p.bigint().default(0n),
    totalGasSpentWei: p.bigint().default(0n),
    firstSeenAt: p.bigint(),  // Block timestamp
    lastActivityAt: p.bigint(),  // Block timestamp
  }),

  /**
   * Strategy - User's portfolio rebalancing strategy
   */
  Strategy: p.createTable(
    {
      id: p.string(),  // Composite: {chainId}-{userAddress}-{strategyId}
      chainId: p.int(),
      strategyId: p.bigint(),

      // Relations
      userId: p.hex().references("User.id"),
      user: p.one("userId"),

      // Strategy details
      name: p.string(),
      tokens: p.string().list(),  // Array of token addresses
      weights: p.int().list(),  // Array of weights in basis points
      rebalanceInterval: p.bigint(),

      // State
      isActive: p.boolean().default(true),
      isPaused: p.boolean().default(false),
      lastRebalanceTime: p.bigint(),

      // Computed stats
      totalRebalances: p.int().default(0),
      totalSwaps: p.int().default(0),
      totalVolumeUSD: p.bigint().default(0n),
      totalGasSpentWei: p.bigint().default(0n),
      averageDrift: p.float().default(0),  // Average drift at rebalance time

      // Timestamps
      createdAt: p.bigint(),
      updatedAt: p.bigint(),
    },
    {
      chainIdUserStrategy: p.index(["chainId", "userId", "strategyId"]),
      userIndex: p.index("userId"),
      activeIndex: p.index("isActive"),
    }
  ),

  /**
   * Rebalance - Execution of a strategy rebalance
   */
  Rebalance: p.createTable(
    {
      id: p.string(),  // {txHash}-{logIndex}

      // Relations
      strategyId: p.string().references("Strategy.id"),
      strategy: p.one("strategyId"),

      // Transaction details
      txHash: p.hex(),
      blockNumber: p.bigint(),
      blockTimestamp: p.bigint(),
      logIndex: p.int(),

      // Rebalance metrics
      drift: p.bigint(),  // Drift in basis points
      driftPercentage: p.float(),  // Computed from drift
      gasReimbursed: p.bigint(),  // Wei
      gasPrice: p.bigint(),  // Wei

      // Status
      status: p.enum("RebalanceStatus").default("SUCCESS"),
      failureReason: p.string().optional(),

      // Computed metrics (calculated from swaps)
      totalSwaps: p.int().default(0),
      totalVolumeIn: p.bigint().default(0n),
      totalVolumeOut: p.bigint().default(0n),
      averagePriceImpact: p.float().default(0),
    },
    {
      strategyIndex: p.index("strategyId"),
      txHashIndex: p.index("txHash"),
      timestampIndex: p.index("blockTimestamp"),
      statusIndex: p.index("status"),
    }
  ),

  /**
   * Swap - Individual token swap within a rebalance
   */
  Swap: p.createTable(
    {
      id: p.string(),  // {txHash}-{logIndex}-{swapIndex}

      // Relations
      rebalanceId: p.string().references("Rebalance.id"),
      rebalance: p.one("rebalanceId"),

      // Swap details
      tokenIn: p.hex(),
      tokenOut: p.hex(),
      amountIn: p.bigint(),
      amountOut: p.bigint(),

      // Computed metrics
      priceImpact: p.float().optional(),  // Percentage

      // Transaction details
      txHash: p.hex(),
      blockTimestamp: p.bigint(),
      logIndex: p.int(),
    },
    {
      rebalanceIndex: p.index("rebalanceId"),
      txHashIndex: p.index("txHash"),
      tokenPairIndex: p.index(["tokenIn", "tokenOut"]),
    }
  ),

  /**
   * SystemEvent - Platform-wide events (DEX approvals, pauses, etc.)
   */
  SystemEvent: p.createTable(
    {
      id: p.string(),  // {txHash}-{logIndex}
      chainId: p.int(),
      type: p.enum("SystemEventType"),

      // Event data (varies by type)
      dexAddress: p.hex().optional(),
      approved: p.boolean().optional(),
      pausedBy: p.hex().optional(),

      // Transaction details
      txHash: p.hex(),
      blockNumber: p.bigint(),
      blockTimestamp: p.bigint(),
      logIndex: p.int(),
    },
    {
      chainIndex: p.index("chainId"),
      typeIndex: p.index("type"),
      timestampIndex: p.index("blockTimestamp"),
    }
  ),

  /**
   * DailyStats - Aggregated daily statistics
   */
  DailyStats: p.createTable(
    {
      id: p.string(),  // {chainId}-{date}
      chainId: p.int(),
      date: p.string(),  // YYYY-MM-DD

      // Daily metrics
      totalRebalances: p.int().default(0),
      totalSwaps: p.int().default(0),
      totalVolumeUSD: p.bigint().default(0n),
      totalGasSpentWei: p.bigint().default(0n),
      uniqueUsers: p.int().default(0),
      activeStrategies: p.int().default(0),

      // Averages
      averageDrift: p.float().default(0),
      averagePriceImpact: p.float().default(0),
    },
    {
      chainDateIndex: p.index(["chainId", "date"]),
      dateIndex: p.index("date"),
    }
  ),

  /**
   * Enums
   */
  RebalanceStatus: p.createEnum(["SUCCESS", "FAILED"]),
  SystemEventType: p.createEnum([
    "DEX_APPROVAL",
    "DEX_REVOCATION",
    "EMERGENCY_PAUSE",
    "EMERGENCY_UNPAUSE",
    "EXECUTOR_UPDATED",
  ]),
}));

import { ponder } from "@/generated";

/**
 * StrategyCreated - User creates a new rebalancing strategy
 */
ponder.on("StrategyRegistry:StrategyCreated", async ({ event, context }) => {
  const { User, Strategy } = context.db;

  const userAddress = event.args.user.toLowerCase();
  const strategyId = event.args.strategyId;
  const chainId = context.network.chainId;

  // Composite ID: chainId-userAddress-strategyId
  const compositeStrategyId = `${chainId}-${userAddress}-${strategyId}`;

  // Upsert user
  await User.upsert({
    id: userAddress,
    create: {
      id: userAddress,
      strategyCount: 1,
      totalRebalances: 0,
      totalVolumeUSD: 0n,
      totalGasSpentWei: 0n,
      firstSeenAt: event.block.timestamp,
      lastActivityAt: event.block.timestamp,
    },
    update: ({ current }) => ({
      strategyCount: current.strategyCount + 1,
      lastActivityAt: event.block.timestamp,
    }),
  });

  // Create strategy
  await Strategy.create({
    id: compositeStrategyId,
    data: {
      chainId,
      strategyId,
      userId: userAddress,
      name: event.args.name,
      tokens: event.args.tokens.map((t) => t.toLowerCase()),
      weights: event.args.weights.map((w) => Number(w)),
      rebalanceInterval: event.args.rebalanceInterval || 3600n, // Default 1 hour if not in event
      isActive: true,
      isPaused: false,
      lastRebalanceTime: event.block.timestamp,
      totalRebalances: 0,
      totalSwaps: 0,
      totalVolumeUSD: 0n,
      totalGasSpentWei: 0n,
      averageDrift: 0,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    },
  });
});

/**
 * StrategyUpdated - User updates strategy tokens/weights
 */
ponder.on("StrategyRegistry:StrategyUpdated", async ({ event, context }) => {
  const { Strategy } = context.db;

  const userAddress = event.args.user.toLowerCase();
  const strategyId = event.args.strategyId;
  const chainId = context.network.chainId;

  const compositeStrategyId = `${chainId}-${userAddress}-${strategyId}`;

  await Strategy.update({
    id: compositeStrategyId,
    data: {
      tokens: event.args.tokens.map((t) => t.toLowerCase()),
      weights: event.args.weights.map((w) => Number(w)),
      updatedAt: event.block.timestamp,
    },
  });
});

/**
 * StrategyPaused - User pauses a strategy
 */
ponder.on("StrategyRegistry:StrategyPaused", async ({ event, context }) => {
  const { Strategy } = context.db;

  const userAddress = event.args.user.toLowerCase();
  const strategyId = event.args.strategyId;
  const chainId = context.network.chainId;

  const compositeStrategyId = `${chainId}-${userAddress}-${strategyId}`;

  await Strategy.update({
    id: compositeStrategyId,
    data: {
      isPaused: true,
      updatedAt: event.block.timestamp,
    },
  });
});

/**
 * StrategyResumed - User resumes a paused strategy
 */
ponder.on("StrategyRegistry:StrategyResumed", async ({ event, context }) => {
  const { Strategy } = context.db;

  const userAddress = event.args.user.toLowerCase();
  const strategyId = event.args.strategyId;
  const chainId = context.network.chainId;

  const compositeStrategyId = `${chainId}-${userAddress}-${strategyId}`;

  await Strategy.update({
    id: compositeStrategyId,
    data: {
      isPaused: false,
      updatedAt: event.block.timestamp,
    },
  });
});

/**
 * StrategyDeleted - User deletes a strategy
 */
ponder.on("StrategyRegistry:StrategyDeleted", async ({ event, context }) => {
  const { Strategy, User } = context.db;

  const userAddress = event.args.user.toLowerCase();
  const strategyId = event.args.strategyId;
  const chainId = context.network.chainId;

  const compositeStrategyId = `${chainId}-${userAddress}-${strategyId}`;

  // Mark strategy as inactive (soft delete)
  await Strategy.update({
    id: compositeStrategyId,
    data: {
      isActive: false,
      updatedAt: event.block.timestamp,
    },
  });

  // Update user strategy count
  await User.update({
    id: userAddress,
    data: ({ current }) => ({
      strategyCount: Math.max(0, current.strategyCount - 1),
      lastActivityAt: event.block.timestamp,
    }),
  });
});

/**
 * LastRebalanceTimeUpdated - Bot updated last rebalance time
 */
ponder.on("StrategyRegistry:LastRebalanceTimeUpdated", async ({ event, context }) => {
  const { Strategy } = context.db;

  const userAddress = event.args.user.toLowerCase();
  const strategyId = event.args.strategyId;
  const chainId = context.network.chainId;

  const compositeStrategyId = `${chainId}-${userAddress}-${strategyId}`;

  await Strategy.update({
    id: compositeStrategyId,
    data: {
      lastRebalanceTime: event.args.timestamp,
      updatedAt: event.block.timestamp,
    },
  });
});

/**
 * RebalanceExecutorUpdated - System event (admin updated executor)
 */
ponder.on("StrategyRegistry:RebalanceExecutorUpdated", async ({ event, context }) => {
  const { SystemEvent } = context.db;

  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  await SystemEvent.create({
    id: eventId,
    data: {
      chainId: context.network.chainId,
      type: "EXECUTOR_UPDATED",
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      logIndex: event.log.logIndex,
    },
  });
});

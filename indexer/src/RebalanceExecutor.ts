import { ponder } from "@/generated";

/**
 * RebalanceExecuted - Successful rebalance execution
 */
ponder.on("RebalanceExecutor:RebalanceExecuted", async ({ event, context }) => {
  const { User, Strategy, Rebalance, DailyStats } = context.db;

  const userAddress = event.args.user.toLowerCase();
  const strategyId = event.args.strategyId;
  const chainId = context.network.chainId;

  const compositeStrategyId = `${chainId}-${userAddress}-${strategyId}`;
  const rebalanceId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Calculate drift percentage from basis points
  const driftBps = event.args.drift;
  const driftPercentage = Number(driftBps) / 100;

  // Create rebalance record
  await Rebalance.create({
    id: rebalanceId,
    data: {
      strategyId: compositeStrategyId,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      logIndex: event.log.logIndex,
      drift: driftBps,
      driftPercentage,
      gasReimbursed: event.args.gasReimbursed,
      gasPrice: event.transaction.gasPrice || 0n,
      status: "SUCCESS",
      totalSwaps: 0,  // Will be updated by SwapExecuted events
      totalVolumeIn: 0n,
      totalVolumeOut: 0n,
      averagePriceImpact: 0,
    },
  });

  // Update strategy stats
  await Strategy.update({
    id: compositeStrategyId,
    data: ({ current }) => ({
      totalRebalances: current.totalRebalances + 1,
      totalGasSpentWei: current.totalGasSpentWei + event.args.gasReimbursed,
      // Update average drift
      averageDrift:
        (current.averageDrift * current.totalRebalances + driftPercentage) /
        (current.totalRebalances + 1),
      updatedAt: event.block.timestamp,
    }),
  });

  // Update user stats
  await User.update({
    id: userAddress,
    data: ({ current }) => ({
      totalRebalances: current.totalRebalances + 1,
      totalGasSpentWei: current.totalGasSpentWei + event.args.gasReimbursed,
      lastActivityAt: event.block.timestamp,
    }),
  });

  // Update daily stats
  const dateStr = new Date(Number(event.block.timestamp) * 1000)
    .toISOString()
    .split("T")[0];
  const dailyStatsId = `${chainId}-${dateStr}`;

  await DailyStats.upsert({
    id: dailyStatsId,
    create: {
      chainId,
      date: dateStr,
      totalRebalances: 1,
      totalSwaps: 0,
      totalVolumeUSD: 0n,
      totalGasSpentWei: event.args.gasReimbursed,
      uniqueUsers: 1,
      activeStrategies: 1,
      averageDrift: driftPercentage,
      averagePriceImpact: 0,
    },
    update: ({ current }) => ({
      totalRebalances: current.totalRebalances + 1,
      totalGasSpentWei: current.totalGasSpentWei + event.args.gasReimbursed,
      averageDrift:
        (current.averageDrift * current.totalRebalances + driftPercentage) /
        (current.totalRebalances + 1),
    }),
  });
});

/**
 * RebalanceFailed - Failed rebalance attempt
 */
ponder.on("RebalanceExecutor:RebalanceFailed", async ({ event, context }) => {
  const { Rebalance } = context.db;

  const userAddress = event.args.user.toLowerCase();
  const strategyId = event.args.strategyId;
  const chainId = context.network.chainId;

  const compositeStrategyId = `${chainId}-${userAddress}-${strategyId}`;
  const rebalanceId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Create failed rebalance record
  await Rebalance.create({
    id: rebalanceId,
    data: {
      strategyId: compositeStrategyId,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      logIndex: event.log.logIndex,
      drift: 0n,
      driftPercentage: 0,
      gasReimbursed: 0n,
      gasPrice: event.transaction.gasPrice || 0n,
      status: "FAILED",
      failureReason: event.args.reason,
      totalSwaps: 0,
      totalVolumeIn: 0n,
      totalVolumeOut: 0n,
      averagePriceImpact: 0,
    },
  });
});

/**
 * SwapExecuted - Individual swap within a rebalance
 */
ponder.on("RebalanceExecutor:SwapExecuted", async ({ event, context }) => {
  const { Swap, Rebalance, Strategy } = context.db;

  // Find the most recent rebalance in this transaction
  // Note: This assumes SwapExecuted events come after RebalanceExecuted
  const rebalances = await Rebalance.findMany({
    where: {
      txHash: event.transaction.hash,
    },
    limit: 1,
    orderBy: { logIndex: "desc" },
  });

  if (rebalances.items.length === 0) {
    console.warn(`No rebalance found for swap in tx ${event.transaction.hash}`);
    return;
  }

  const rebalance = rebalances.items[0];
  const swapId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Calculate price impact (simplified - in production use oracle prices)
  const priceImpact = 0; // TODO: Calculate actual price impact

  // Create swap record
  await Swap.create({
    id: swapId,
    data: {
      rebalanceId: rebalance.id,
      tokenIn: event.args.tokenIn.toLowerCase(),
      tokenOut: event.args.tokenOut.toLowerCase(),
      amountIn: event.args.amountIn,
      amountOut: event.args.amountOut,
      priceImpact,
      txHash: event.transaction.hash,
      blockTimestamp: event.block.timestamp,
      logIndex: event.log.logIndex,
    },
  });

  // Update rebalance totals
  await Rebalance.update({
    id: rebalance.id,
    data: ({ current }) => ({
      totalSwaps: current.totalSwaps + 1,
      totalVolumeIn: current.totalVolumeIn + event.args.amountIn,
      totalVolumeOut: current.totalVolumeOut + event.args.amountOut,
    }),
  });

  // Update strategy totals
  await Strategy.update({
    id: rebalance.strategyId,
    data: ({ current }) => ({
      totalSwaps: current.totalSwaps + 1,
    }),
  });

  // Update daily stats
  const dateStr = new Date(Number(event.block.timestamp) * 1000)
    .toISOString()
    .split("T")[0];
  const dailyStatsId = `${context.network.chainId}-${dateStr}`;

  await DailyStats.update({
    id: dailyStatsId,
    data: ({ current }) => ({
      totalSwaps: current.totalSwaps + 1,
    }),
  });
});

/**
 * DEXApprovalUpdated - Admin approved/revoked a DEX
 */
ponder.on("RebalanceExecutor:DEXApprovalUpdated", async ({ event, context }) => {
  const { SystemEvent } = context.db;

  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  await SystemEvent.create({
    id: eventId,
    data: {
      chainId: context.network.chainId,
      type: event.args.approved ? "DEX_APPROVAL" : "DEX_REVOCATION",
      dexAddress: event.args.dex.toLowerCase(),
      approved: event.args.approved,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      logIndex: event.log.logIndex,
    },
  });
});

/**
 * EmergencyPaused - System paused by admin
 */
ponder.on("RebalanceExecutor:EmergencyPaused", async ({ event, context }) => {
  const { SystemEvent } = context.db;

  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  await SystemEvent.create({
    id: eventId,
    data: {
      chainId: context.network.chainId,
      type: "EMERGENCY_PAUSE",
      pausedBy: event.args.caller.toLowerCase(),
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      logIndex: event.log.logIndex,
    },
  });
});

/**
 * EmergencyUnpaused - System unpaused by admin
 */
ponder.on("RebalanceExecutor:EmergencyUnpaused", async ({ event, context }) => {
  const { SystemEvent } = context.db;

  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  await SystemEvent.create({
    id: eventId,
    data: {
      chainId: context.network.chainId,
      type: "EMERGENCY_UNPAUSE",
      pausedBy: event.args.caller.toLowerCase(),
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      logIndex: event.log.logIndex,
    },
  });
});

/**
 * Rebalance Job Data
 */
export interface RebalanceJobData {
  strategyId: string;
  userAddress: string;
  chainId: number;
  drift: number;
  priority?: 'high' | 'medium' | 'low';
  triggeredBy?: 'auto' | 'user' | 'admin';
}

/**
 * Indexer Job Data
 */
export interface IndexerJobData {
  chainId: number;
  eventName: string;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  data: any;
}

/**
 * Analytics Job Data
 */
export interface AnalyticsJobData {
  type: 'tvl' | 'performance' | 'gas-savings' | 'drift';
  chainId?: number;
  strategyId?: string;
  userAddress?: string;
}

/**
 * Notification Job Data
 */
export interface NotificationJobData {
  userAddress: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  channels?: ('websocket' | 'discord' | 'telegram')[];
}

/**
 * Queue Names
 */
export const QUEUE_NAMES = {
  REBALANCE: 'rebalance',
  INDEXER: 'indexer',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Job Names
 */
export const JOB_NAMES = {
  // Rebalance jobs
  EXECUTE_REBALANCE: 'execute',
  CHECK_STRATEGIES: 'check-strategies',

  // Indexer jobs
  PROCESS_EVENT: 'process-event',
  BACKFILL_EVENTS: 'backfill',

  // Analytics jobs
  CALCULATE_TVL: 'calculate-tvl',
  CALCULATE_PERFORMANCE: 'calculate-performance',
  CALCULATE_GAS_SAVINGS: 'calculate-gas-savings',

  // Notification jobs
  SEND_NOTIFICATION: 'send',
  SEND_BATCH_NOTIFICATIONS: 'send-batch',
} as const;

/**
 * Event channel names for Redis pub/sub
 */
export enum EventChannel {
  STRATEGY_CREATED = 'strategy:created',
  STRATEGY_UPDATED = 'strategy:updated',
  STRATEGY_DELETED = 'strategy:deleted',
  DELEGATION_CREATED = 'delegation:created',
  DELEGATION_REVOKED = 'delegation:revoked',
  REBALANCE_QUEUED = 'rebalance:queued',
  REBALANCE_STARTED = 'rebalance:started',
  REBALANCE_COMPLETED = 'rebalance:completed',
  REBALANCE_FAILED = 'rebalance:failed',
  EVENT_INDEXED = 'event:indexed',
  GAS_PRICE_UPDATED = 'gas:updated',
  SYSTEM_ALERT = 'system:alert',
}

/**
 * Base event payload
 */
export interface BaseEvent {
  timestamp: string;
  source: 'api' | 'bot' | 'indexer';
}

/**
 * Strategy events
 */
export interface StrategyCreatedEvent extends BaseEvent {
  strategyId: string;
  userAddress: string;
  chainId: number;
  tokens: string[];
  weights: number[];
}

export interface StrategyUpdatedEvent extends BaseEvent {
  strategyId: string;
  userAddress: string;
  changes: {
    weights?: number[];
    rebalanceInterval?: number;
    isActive?: boolean;
  };
}

export interface StrategyDeletedEvent extends BaseEvent {
  strategyId: string;
  userAddress: string;
}

/**
 * Delegation events
 */
export interface DelegationCreatedEvent extends BaseEvent {
  delegationId: string;
  strategyId: string;
  userAddress: string;
  delegateAddress: string;
  chainId: number;
}

export interface DelegationRevokedEvent extends BaseEvent {
  delegationId: string;
  userAddress: string;
}

/**
 * Rebalance events
 */
export interface RebalanceQueuedEvent extends BaseEvent {
  strategyId: string;
  userAddress: string;
  chainId: number;
  drift: number;
  priority: 'high' | 'medium' | 'low';
}

export interface RebalanceStartedEvent extends BaseEvent {
  strategyId: string;
  userAddress: string;
  chainId: number;
  txHash?: string;
}

export interface RebalanceCompletedEvent extends BaseEvent {
  strategyId: string;
  userAddress: string;
  chainId: number;
  txHash: string;
  drift: number;
  gasUsed: string;
  success: boolean;
  error?: string;
}

/**
 * Indexer events
 */
export interface EventIndexedEvent extends BaseEvent {
  chainId: number;
  eventName: string;
  blockNumber: string;
  transactionHash: string;
  contractAddress: string;
}

/**
 * Gas events
 */
export interface GasPriceUpdatedEvent extends BaseEvent {
  chainId: number;
  gasPrice: string;
  gasPriceGwei: number;
}

/**
 * System events
 */
export interface SystemAlertEvent extends BaseEvent {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: any;
}

/**
 * Union type of all events
 */
export type EventPayload =
  | StrategyCreatedEvent
  | StrategyUpdatedEvent
  | StrategyDeletedEvent
  | DelegationCreatedEvent
  | DelegationRevokedEvent
  | RebalanceQueuedEvent
  | RebalanceStartedEvent
  | RebalanceCompletedEvent
  | EventIndexedEvent
  | GasPriceUpdatedEvent
  | SystemAlertEvent;

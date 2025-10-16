/**
 * Contract ABIs for bot operations
 * Only includes the functions needed by the bot
 */

export const RebalanceExecutorABI = [
  {
    type: 'function',
    name: 'rebalance',
    inputs: [
      { name: 'userAccount', type: 'address', internalType: 'address' },
      { name: 'strategyId', type: 'uint256', internalType: 'uint256' },
      { name: 'tokensIn', type: 'address[]', internalType: 'address[]' },
      { name: 'swapTargets', type: 'address[]', internalType: 'address[]' },
      { name: 'swapCallDatas', type: 'bytes[]', internalType: 'bytes[]' },
      { name: 'minOutputAmounts', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'nativeValues', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'permissionContexts', type: 'bytes[]', internalType: 'bytes[]' },
      { name: 'modes', type: 'bytes32[]', internalType: 'bytes32[]' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'shouldRebalance',
    inputs: [
      { name: 'userAccount', type: 'address', internalType: 'address' },
      { name: 'strategyId', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      { name: 'isShouldRebalance', type: 'bool', internalType: 'bool' },
      { name: 'drift', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export const StrategyRegistryABI = [
  {
    type: 'function',
    name: 'getStrategy',
    inputs: [
      { name: 'user', type: 'address', internalType: 'address' },
      { name: 'strategyId', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      {
        name: 'strategy',
        type: 'tuple',
        internalType: 'struct StrategyLibrary.Strategy',
        components: [
          { name: 'id', type: 'uint256', internalType: 'uint256' },
          { name: 'tokens', type: 'address[]', internalType: 'address[]' },
          { name: 'weights', type: 'uint256[]', internalType: 'uint256[]' },
          { name: 'rebalanceInterval', type: 'uint256', internalType: 'uint256' },
          { name: 'lastRebalanceTime', type: 'uint256', internalType: 'uint256' },
          { name: 'isActive', type: 'bool', internalType: 'bool' },
          { name: 'name', type: 'string', internalType: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

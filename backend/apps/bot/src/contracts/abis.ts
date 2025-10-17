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
      { name: 'modes', type: 'bytes32[]', internalType: 'ModeCode[]' },
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
  // DEBUG FUNCTIONS
  {
    type: 'function',
    name: 'testStrategyOwnership',
    inputs: [
      { name: 'userAccount', type: 'address', internalType: 'address' },
      { name: 'strategyId', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      { name: 'isValid', type: 'bool', internalType: 'bool' },
      { name: 'strategyOwner', type: 'address', internalType: 'address' },
      { name: 'delegatorOwner', type: 'address', internalType: 'address' },
      { name: 'error', type: 'string', internalType: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'testDelegationNoOp',
    inputs: [
      { name: 'userAccount', type: 'address', internalType: 'address' },
      { name: 'permissionContext', type: 'bytes', internalType: 'bytes' },
      { name: 'mode', type: 'bytes32', internalType: 'ModeCode' },
    ],
    outputs: [
      { name: 'success', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'testDelegationApproval',
    inputs: [
      { name: 'userAccount', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'permissionContext', type: 'bytes', internalType: 'bytes' },
      { name: 'mode', type: 'bytes32', internalType: 'ModeCode' },
    ],
    outputs: [
      { name: 'success', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'testDelegationTransfer',
    inputs: [
      { name: 'userAccount', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'recipient', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'permissionContext', type: 'bytes', internalType: 'bytes' },
      { name: 'mode', type: 'bytes32', internalType: 'ModeCode' },
    ],
    outputs: [
      { name: 'success', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'testDelegationSingleSwap',
    inputs: [
      { name: 'userAccount', type: 'address', internalType: 'address' },
      { name: 'tokenIn', type: 'address', internalType: 'address' },
      { name: 'swapTarget', type: 'address', internalType: 'address' },
      { name: 'swapCallData', type: 'bytes', internalType: 'bytes' },
      { name: 'nativeValue', type: 'uint256', internalType: 'uint256' },
      { name: 'permissionContext', type: 'bytes', internalType: 'bytes' },
      { name: 'mode', type: 'bytes32', internalType: 'ModeCode' },
    ],
    outputs: [
      { name: 'success', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'testDelegationSwapOnly',
    inputs: [
      { name: 'userAccount', type: 'address', internalType: 'address' },
      { name: 'swapTarget', type: 'address', internalType: 'address' },
      { name: 'swapCallData', type: 'bytes', internalType: 'bytes' },
      { name: 'nativeValue', type: 'uint256', internalType: 'uint256' },
      { name: 'permissionContext', type: 'bytes', internalType: 'bytes' },
      { name: 'mode', type: 'bytes32', internalType: 'ModeCode' },
    ],
    outputs: [
      { name: 'success', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'nonpayable',
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

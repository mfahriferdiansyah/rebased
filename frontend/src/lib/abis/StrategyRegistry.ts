export const StrategyRegistryABI = [
  {
    "type": "function",
    "name": "createStrategy",
    "inputs": [
      {
        "name": "strategyId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "tokens",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "weights",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "rebalanceInterval",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getStrategy",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "strategyId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "strategy",
        "type": "tuple",
        "internalType": "struct StrategyLibrary.Strategy",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "tokens",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "weights",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "rebalanceInterval",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastRebalanceTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "isActive",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pauseStrategy",
    "inputs": [
      {
        "name": "strategyId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resumeStrategy",
    "inputs": [
      {
        "name": "strategyId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "StrategyCreated",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "strategyId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "name",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "tokens",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "weights",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "StrategyAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "StrategyNotFound",
    "inputs": []
  }
] as const;

// Contract addresses by chainId
export const STRATEGY_REGISTRY_ADDRESS: Record<number, `0x${string}`> = {
  10143: '0x83f8381fbA4D5AEcc3D85bE4c15fF55C82aA61a9', // Monad testnet
  84532: '0xc4F2bA997bA17c778A274708419824039E0E1d54', // Base Sepolia
};

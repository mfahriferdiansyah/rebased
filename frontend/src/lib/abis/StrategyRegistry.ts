export const StrategyRegistryABI = [
  {
    "type": "function",
    "name": "createStrategy",
    "inputs": [
      {
        "name": "delegator",
        "type": "address",
        "internalType": "address"
      },
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

// Contract addresses by chainId - Use environment variables
// Deployed 2025-10-16 - Latest with MetaMask Integration
export const STRATEGY_REGISTRY_ADDRESS: Record<number, `0x${string}`> = {
  10143: (import.meta.env.VITE_MONAD_STRATEGY_REGISTRY || '0x0000000000000000000000000000000000000000') as `0x${string}`, // Monad testnet
  84532: (import.meta.env.VITE_BASE_STRATEGY_REGISTRY || '0x0000000000000000000000000000000000000000') as `0x${string}`, // Base Sepolia
};

/**
 * Get StrategyRegistry address for a chain, with validation
 */
export function getStrategyRegistryAddress(chainId: number): `0x${string}` {
  const address = STRATEGY_REGISTRY_ADDRESS[chainId];
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`StrategyRegistry address not configured for chain ${chainId}. Please check your .env file.`);
  }
  return address;
}

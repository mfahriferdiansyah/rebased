import { defineChain } from 'viem';

/**
 * Monad Testnet Chain Definition
 */
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MONAD',
  },
  rpcUrls: {
    default: {
      http: [process.env.MONAD_RPC_URL || 'https://testnet.monad.xyz'],
    },
    public: {
      http: [process.env.MONAD_RPC_URL || 'https://testnet.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
});

/**
 * Base Sepolia Testnet Chain Definition
 */
export const baseSepoliaTestnet = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.BASE_RPC_URL || 'https://sepolia.base.org'],
    },
    public: {
      http: [process.env.BASE_RPC_URL || 'https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
});

export type SupportedChain = 'monad' | 'base';

export const CHAIN_CONFIGS = {
  monad: {
    chain: monadTestnet,
    chainId: 10143,
    name: 'Monad Testnet',
    nativeCurrency: 'MONAD',
  },
  base: {
    chain: baseSepoliaTestnet,
    chainId: 84532,
    name: 'Base Sepolia',
    nativeCurrency: 'ETH',
  },
};

/**
 * Get chain config by chain ID
 */
export function getChainById(chainId: number): SupportedChain | null {
  if (chainId === 10143) return 'monad';
  if (chainId === 84532) return 'base';
  return null;
}

/**
 * Get chain config by name
 */
export function getChainConfig(chain: SupportedChain) {
  return CHAIN_CONFIGS[chain];
}

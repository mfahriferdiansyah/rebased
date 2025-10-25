import { defineChain } from 'viem';

/**
 * Monad Testnet Configuration
 * Chain ID: 10143
 */
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] },
    public: { http: [import.meta.env.VITE_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
});

/**
 * Base Sepolia Testnet Configuration
 * Chain ID: 84532
 */
export const baseSepoliaTestnet = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'] },
    public: { http: [import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
});

/**
 * Base Mainnet Configuration
 * Chain ID: 8453
 */
export const baseMainnet = defineChain({
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org'] },
    public: { http: [import.meta.env.VITE_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://base.blockscout.com',
    },
  },
  testnet: false,
});

/**
 * All supported chains
 * Base Mainnet (production) + Monad Testnet (development)
 */
export const supportedChains = [
  baseMainnet,        // Base Mainnet (8453)
  monadTestnet,       // Monad Testnet (10143)
  // baseSepoliaTestnet, // Not used
] as const;

/**
 * Default chain (Base Mainnet for production)
 */
export const defaultChain = baseMainnet;

/**
 * Chain ID to chain mapping
 */
export const chainById = {
  [monadTestnet.id]: monadTestnet,
  [baseSepoliaTestnet.id]: baseSepoliaTestnet,
  [baseMainnet.id]: baseMainnet,
} as const;

/**
 * Get chain by ID
 */
export function getChainById(chainId: number) {
  return chainById[chainId as keyof typeof chainById];
}

/**
 * Get native currency symbol for a chain ID
 * @param chainId - Chain ID (10143 = MON, 84532 = ETH, etc.)
 * @returns Native currency symbol (e.g., 'MON', 'ETH')
 */
export function getNativeCurrencySymbol(chainId: number): string {
  const chain = getChainById(chainId);
  return chain?.nativeCurrency.symbol || 'ETH';
}

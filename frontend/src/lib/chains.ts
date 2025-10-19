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
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
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
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
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
 * All supported chains
 */
export const supportedChains = [monadTestnet, baseSepoliaTestnet] as const;

/**
 * Default chain (Monad)
 */
export const defaultChain = monadTestnet;

/**
 * Chain ID to chain mapping
 */
export const chainById = {
  [monadTestnet.id]: monadTestnet,
  [baseSepoliaTestnet.id]: baseSepoliaTestnet,
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

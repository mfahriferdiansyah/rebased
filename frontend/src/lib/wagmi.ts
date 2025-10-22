import { createConfig, http } from 'wagmi';
import { monadTestnet, baseSepoliaTestnet } from './chains';

/**
 * Wagmi configuration for use with Privy
 * This enables contract interactions and blockchain queries
 * Supports Base Sepolia (default) and Monad Testnet
 */
export const wagmiConfig = createConfig({
  chains: [baseSepoliaTestnet, monadTestnet],
  transports: {
    [baseSepoliaTestnet.id]: http(),
    [monadTestnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}

import { createConfig, http } from 'wagmi';
import { monadTestnet, baseSepoliaTestnet } from './chains';

/**
 * Wagmi configuration for use with Privy
 * This enables contract interactions and blockchain queries
 */
export const wagmiConfig = createConfig({
  chains: [monadTestnet, baseSepoliaTestnet],
  transports: {
    [monadTestnet.id]: http(),
    [baseSepoliaTestnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}

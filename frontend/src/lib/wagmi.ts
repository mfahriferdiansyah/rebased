import { createConfig, http } from 'wagmi';
import { baseMainnet } from './chains';

/**
 * Wagmi configuration for use with Privy
 * This enables contract interactions and blockchain queries
 * PRODUCTION: Base Mainnet only
 */
export const wagmiConfig = createConfig({
  chains: [baseMainnet],
  transports: {
    [baseMainnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}

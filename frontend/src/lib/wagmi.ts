import { createConfig, http } from 'wagmi';
import { monadTestnet, baseSepoliaTestnet } from './chains';

/**
 * Wagmi configuration for use with Privy
 * This enables contract interactions and blockchain queries
 * ONLY Monad Testnet for hackathon (Base coming soon)
 */
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}

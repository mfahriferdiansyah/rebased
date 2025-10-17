/**
 * Contract addresses by chain
 * These should match the deployed contract addresses
 */

export const CONTRACTS = {
  monad: {
    registry: process.env.MONAD_REGISTRY as `0x${string}`,
    executor: process.env.MONAD_EXECUTOR as `0x${string}`,
    delegationManager: process.env.MONAD_DELEGATION_MANAGER as `0x${string}`,
    oracle: process.env.MONAD_ORACLE as `0x${string}`,
    uniswapHelper: process.env.MONAD_UNISWAP_HELPER as `0x${string}`,
    config: process.env.MONAD_CONFIG as `0x${string}`,
    uniswapV2Router: process.env.UNISWAP_V2_ROUTER_MONAD as `0x${string}`,
  },
  base: {
    registry: process.env.BASE_REGISTRY as `0x${string}`,
    executor: process.env.BASE_EXECUTOR as `0x${string}`,
    delegationManager: process.env.BASE_DELEGATION_MANAGER as `0x${string}`,
    oracle: process.env.BASE_ORACLE as `0x${string}`,
    uniswapHelper: process.env.BASE_UNISWAP_HELPER as `0x${string}`,
    config: process.env.BASE_CONFIG as `0x${string}`,
  },
} as const;

export type SupportedChain = keyof typeof CONTRACTS;

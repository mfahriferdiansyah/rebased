/**
 * Token Logo Utilities
 * Simple approach - rely on backend API for logoUri
 */

/**
 * Get chain logo - using actual logo images, NO EMOJIS
 */
export function getChainLogoUrl(chainId: number): string {
  // Monad logo as base64 data URI
  const MONAD_LOGO = 'data:image/png;base64,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';

  // Base logo from LiFi GitHub repository
  const BASE_LOGO = 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg';

  // Map chain IDs to their logo URLs - NO EMOJIS, only actual images
  const chainLogos: Record<number, string> = {
    10143: MONAD_LOGO, // Monad testnet
    10143: MONAD_LOGO, // Monad
    8453: BASE_LOGO, // Base mainnet
    84532: BASE_LOGO, // Base Sepolia
    1: '/chains/ethereum.svg',
    56: '/chains/bsc.svg',
    137: '/chains/polygon.svg',
  };

  return chainLogos[chainId] || '/chains/default.svg';
}

/**
 * Generate fallback color for token initials based on symbol
 */
export function getTokenColor(symbol: string): string {
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate pastel colors for better readability
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-red-100 text-red-700',
    'bg-orange-100 text-orange-700',
  ];

  return colors[Math.abs(hash) % colors.length];
}

/**
 * TokenIcon Component
 * Displays token logo with simple fallback to initials
 */

import { useState } from 'react';
import { getChainLogoUrl } from '@/lib/utils/token-logo';
import { cn } from '@/lib/utils';

interface TokenIconProps {
  /** Token contract address (optional for backwards compatibility) */
  address?: string;
  /** Chain ID (e.g., 10143 for Monad, 84532 for Base Sepolia) */
  chainId: number;
  /** Token symbol (e.g., "WETH", "USDC") */
  symbol: string;
  /** Logo URI from backend API */
  logoUri?: string;
  /** Size in pixels (default: 40) */
  size?: number;
  /** Whether to show chain indicator badge (default: true) */
  showChainBadge?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function TokenIcon({
  address,
  chainId,
  symbol,
  logoUri,
  size = 40,
  showChainBadge = true,
  className,
}: TokenIconProps) {
  const [showFallback, setShowFallback] = useState(!logoUri);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle image load error - show fallback
  const handleError = () => {
    setShowFallback(true);
  };

  // Handle successful image load
  const handleLoad = () => {
    setImageLoaded(true);
  };

  // Get initials from symbol (first 2 characters)
  const getInitials = () => {
    return symbol.slice(0, 2).toUpperCase();
  };

  const chainLogoUrl = getChainLogoUrl(chainId);
  const badgeSize = Math.max(size * 0.35, 14); // Minimum 14px badge

  return (
    <div className={cn('relative inline-block', className)} style={{ width: size, height: size }}>
      {showFallback || !logoUri ? (
        // Fallback: Show token symbol initials with consistent monochrome styling
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-sm font-semibold bg-gray-100 text-gray-700 border-2 border-dashed border-gray-300"
          style={{ fontSize: size * 0.4 }}
        >
          {getInitials()}
        </div>
      ) : (
        <>
          {/* Try to load image from logoUri */}
          <img
            src={logoUri}
            alt={symbol}
            className={cn(
              'w-full h-full rounded-full object-cover transition-opacity',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onError={handleError}
            onLoad={handleLoad}
          />
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-100 rounded-full animate-pulse" />
          )}
        </>
      )}

      {/* Chain indicator badge - actual logo image */}
      {showChainBadge && (
        <img
          src={chainLogoUrl}
          alt={`Chain ${chainId}`}
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white shadow-sm"
          style={{ width: badgeSize, height: badgeSize }}
        />
      )}
    </div>
  );
}

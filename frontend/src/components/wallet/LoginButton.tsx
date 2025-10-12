import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { LogIn, Loader2 } from 'lucide-react';

/**
 * Login Button Component
 *
 * Handles all authentication methods via Privy:
 * - Email (OTP)
 * - Google OAuth
 * - Twitter OAuth
 * - External wallet (MetaMask, WalletConnect)
 *
 * Automatically creates embedded wallet for email/social users
 */
export function LoginButton() {
  const { ready, authenticated, login } = usePrivy();

  // Still initializing
  if (!ready) {
    return (
      <Button disabled variant="outline" size="sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Already authenticated
  if (authenticated) {
    return null;
  }

  // Show login button
  return (
    <Button
      onClick={login}
      variant="default"
      size="sm"
      className="bg-gray-900 hover:bg-gray-800 text-white"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign In
    </Button>
  );
}

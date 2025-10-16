import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Copy,
  CreditCard,
  Download,
  LogOut,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

/**
 * Wallet Info Dropdown Component
 *
 * Shows:
 * - User address (shortened)
 * - Avatar (first letter of email or address)
 * - Copy address
 * - Buy crypto (Moonpay onramp)
 * - Export wallet
 * - Sign out
 */
export function WalletInfo() {
  const { user, ready, authenticated, logout, exportWallet, fundWallet } =
    usePrivy();
  const { wallets } = useWallets();
  
  const [isOnrampLoading, setIsOnrampLoading] = useState(false);

  // Not ready or not authenticated
  if (!ready || !authenticated) {
    return null;
  }

  // Get primary wallet
  const wallet = wallets[0];
  const address = wallet?.address;

  if (!address) {
    return null;
  }

  // Get display name (email or shortened address)
  const displayName =
    user?.email?.address ||
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  // Get avatar letter (first letter of email or address)
  const avatarLetter =
    user?.email?.address?.[0]?.toUpperCase() || address.slice(2, 3).toUpperCase();

  // Copy address to clipboard
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied', {
      description: 'Wallet address copied to clipboard',
    });
  };

  // Open Moonpay onramp
  const handleBuyCrypto = async () => {
    setIsOnrampLoading(true);
    try {
      await fundWallet();
    } catch (error) {
      toast.error('Onramp error', {
        description: 'Failed to open buy crypto modal',
      });
    } finally {
      setIsOnrampLoading(false);
    }
  };

  // Export wallet (private key)
  const handleExportWallet = async () => {
    try {
      await exportWallet();
    } catch (error) {
      toast.error('Export error', {
        description: 'Failed to export wallet',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 px-3"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {avatarLetter}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{displayName}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Wallet Address */}
        <div className="px-2 py-2">
          <div className="text-xs text-gray-500">Wallet Address</div>
          <div className="text-xs font-mono mt-1">
            {address.slice(0, 10)}...{address.slice(-8)}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Copy Address */}
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>

        {/* Buy Crypto (Onramp) */}
        <DropdownMenuItem
          onClick={handleBuyCrypto}
          disabled={isOnrampLoading}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {isOnrampLoading ? 'Opening...' : 'Buy Crypto'}
        </DropdownMenuItem>

        {/* Export Wallet */}
        {wallet?.walletClientType === 'privy' && (
          <DropdownMenuItem onClick={handleExportWallet}>
            <Download className="mr-2 h-4 w-4" />
            Export Wallet
          </DropdownMenuItem>
        )}

        {/* View on Explorer */}
        <DropdownMenuItem
          onClick={() =>
            window.open(
              `https://explorer.testnet.monadexplorer.com/address/${address}`,
              '_blank'
            )
          }
        >
          <Wallet className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem onClick={logout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

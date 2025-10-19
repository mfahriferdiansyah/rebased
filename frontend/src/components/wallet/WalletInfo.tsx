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
          className="gap-2 px-3 h-9 border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        >
          <Avatar className="h-5 w-5 bg-gray-900">
            <AvatarFallback className="text-xs text-white bg-gray-900">
              {avatarLetter}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-900">{displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-600" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 border-gray-300">
        {/* Wallet Address */}
        <div className="px-3 py-2.5 bg-gray-50">
          <div className="text-xs font-medium text-gray-600 mb-1">Wallet Address</div>
          <div className="text-xs font-mono text-gray-900">
            {address.slice(0, 10)}...{address.slice(-8)}
          </div>
        </div>

        <DropdownMenuSeparator className="bg-gray-200" />

        {/* Copy Address */}
        <DropdownMenuItem onClick={handleCopyAddress} className="text-gray-900 focus:bg-gray-100">
          <Copy className="mr-2 h-4 w-4 text-gray-600" />
          <span className="text-sm">Copy Address</span>
        </DropdownMenuItem>

        {/* Buy Crypto (Onramp) */}
        <DropdownMenuItem
          onClick={handleBuyCrypto}
          disabled={isOnrampLoading}
          className="text-gray-900 focus:bg-gray-100"
        >
          <CreditCard className="mr-2 h-4 w-4 text-gray-600" />
          <span className="text-sm">{isOnrampLoading ? 'Opening...' : 'Buy Crypto'}</span>
        </DropdownMenuItem>

        {/* Export Wallet */}
        {wallet?.walletClientType === 'privy' && (
          <DropdownMenuItem onClick={handleExportWallet} className="text-gray-900 focus:bg-gray-100">
            <Download className="mr-2 h-4 w-4 text-gray-600" />
            <span className="text-sm">Export Wallet</span>
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
          className="text-gray-900 focus:bg-gray-100"
        >
          <Wallet className="mr-2 h-4 w-4 text-gray-600" />
          <span className="text-sm">View on Explorer</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-gray-200" />

        {/* Sign Out */}
        <DropdownMenuItem onClick={logout} className="text-orange-600 focus:bg-orange-50 focus:text-orange-700">
          <LogOut className="mr-2 h-4 w-4" />
          <span className="text-sm">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

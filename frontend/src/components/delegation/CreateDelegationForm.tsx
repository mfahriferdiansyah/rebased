import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useDelegation } from '@/hooks/useDelegation';
import { getBotExecutorAddress } from '@/lib/utils/delegation-signatures';
import { Loader2, Info, Shield, Wallet } from 'lucide-react';

interface CreateDelegationFormProps {
  chainId?: number;
  onSuccess?: () => void;
}

export function CreateDelegationForm({
  chainId: defaultChainId,
  onSuccess,
}: CreateDelegationFormProps) {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { createDelegation, creating, isReady } = useDelegation();

  const [selectedChainId, setSelectedChainId] = useState<number>(
    defaultChainId || 10143
  );
  const [useCustomDelegate, setUseCustomDelegate] = useState(false);
  const [customDelegateAddress, setCustomDelegateAddress] = useState('');

  // Get default bot executor for selected chain
  const defaultBotAddress = getBotExecutorAddress(selectedChainId);
  const delegateAddress = useCustomDelegate ? customDelegateAddress : defaultBotAddress;

  // Validation states - just check if address exists
  const wallet = wallets[0];
  const userAddress = wallet?.address;
  const hasWallet = !!userAddress; // Simplified: just check address exists
  const canCreate = isReady && hasWallet && !creating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const delegation = await createDelegation(
      undefined, // No strategy ID - delegation can be linked later
      useCustomDelegate ? (delegateAddress as `0x${string}`) : null,
      selectedChainId
    );

    if (delegation) {
      // Reset form
      setUseCustomDelegate(false);
      setCustomDelegateAddress('');
      onSuccess?.();
    }
  };

  const handleChainChange = (value: string) => {
    const newChainId = parseInt(value);
    setSelectedChainId(newChainId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      {/* Wallet Connection Warning */}
      {!hasWallet && ready && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex gap-2">
            <Wallet className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-orange-900 text-sm">Wallet Required</div>
              <div className="text-orange-700 text-xs leading-relaxed">
                Please connect your wallet to create delegations. You need an active wallet
                connection to sign the delegation.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected Wallet Info */}
      {hasWallet && userAddress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div>
              <div className="font-medium text-green-900 text-xs">Wallet Connected</div>
              <div className="font-mono text-green-700 text-xs">
                {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-medium text-blue-900 text-sm">Create Delegation First</div>
            <div className="text-blue-700 text-xs leading-relaxed">
              You can create your delegation now and link it to a strategy later when you're ready.
              This gives the bot permission to execute trades on your behalf.
            </div>
          </div>
        </div>
      </div>

      {/* Chain Selection */}
      <div>
        <Label htmlFor="chain">Chain</Label>
        <Select
          value={selectedChainId.toString()}
          onValueChange={handleChainChange}
        >
          <SelectTrigger id="chain">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10143">Monad Testnet</SelectItem>
            <SelectItem value="84532">Base Sepolia</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-gray-500 mt-1">
          Network where delegation will be active
        </div>
      </div>

      {/* Bot Executor Address */}
      <div>
        <Label htmlFor="delegate-address">Bot Executor Address</Label>
        {useCustomDelegate ? (
          <Input
            id="delegate-address"
            placeholder="0x..."
            value={customDelegateAddress}
            onChange={e => setCustomDelegateAddress(e.target.value)}
            pattern="^0x[a-fA-F0-9]{40}$"
            required
          />
        ) : (
          <div className="relative">
            <Input
              id="delegate-address"
              value={defaultBotAddress}
              disabled
              className="bg-gray-50 font-mono text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-gray-500">
            {useCustomDelegate
              ? 'Custom bot executor address'
              : 'Official Rebased bot executor (recommended)'}
          </div>
          <button
            type="button"
            onClick={() => setUseCustomDelegate(!useCustomDelegate)}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            {useCustomDelegate ? 'Use default' : 'Use custom'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-medium text-blue-900 text-sm">What is a delegation?</div>
            <div className="text-blue-700 text-xs leading-relaxed">
              A delegation allows the bot to execute rebalances for your strategy without
              requiring your signature each time. You maintain full control and can revoke
              access anytime. This uses ERC-7710 standard with EIP-712 signatures.
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex gap-2">
          <Shield className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-medium text-orange-900 text-sm">Security Notice</div>
            <div className="text-orange-700 text-xs leading-relaxed">
              Only delegate to trusted addresses. The delegate will have authority to execute
              actions on your behalf according to your strategy rules.
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!canCreate}
        className="w-full"
      >
        {creating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Delegation...
          </>
        ) : !hasWallet ? (
          <>
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet First
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Create Delegation
          </>
        )}
      </Button>

      {/* Status Messages */}
      {creating && (
        <div className="text-xs text-gray-500 text-center">
          Please sign the delegation in your wallet...
        </div>
      )}
      {!hasWallet && (
        <div className="text-xs text-orange-600 text-center">
          Wallet connection required to create delegation
        </div>
      )}
    </form>
  );
}

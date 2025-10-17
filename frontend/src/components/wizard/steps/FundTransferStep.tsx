import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
  ArrowDownUp,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits, type Address } from 'viem';
import { getChainById } from '@/lib/chains';
import type { Strategy } from '@/lib/types/strategy';
import { BlockType, type AssetBlock } from '@/lib/types/blocks';

interface FundTransferStepProps {
  delegatorAddress: Address;
  strategy?: Strategy;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

interface TokenTransferState {
  address: Address;
  symbol: string;
  decimals: number;
  isNative: boolean;
  amount: string;
  transferring: boolean;
  completed: boolean;
  txHash?: `0x${string}`;
  eoaBalance?: bigint;
  delegatorBalance?: bigint;
}

/**
 * FundTransferStep Component
 *
 * Step 2 of Strategy Setup Wizard
 * - Shows balances for EOA and DeleGator
 * - Allows transferring native tokens and ERC-20s from strategy
 * - Tracks transfer status for each token
 */
export function FundTransferStep({
  delegatorAddress,
  strategy,
  onNext,
  onBack,
  onCancel,
}: FundTransferStepProps) {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const chain = getChainById(chainId);

  const {
    transferToDeleGator,
    transferTokenToDeleGator,
    getTokenBalance,
  } = useSmartAccount();

  // Extract strategy tokens
  const strategyTokens = strategy?.blocks
    .filter((b): b is AssetBlock => b.type === BlockType.ASSET)
    .map(b => ({
      address: b.data.address,
      symbol: b.data.symbol,
      decimals: b.data.decimals || 18,
      isNative: b.data.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    })) || [];

  // Native balance from wagmi
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: userAddress,
  });
  const { data: delegatorNativeBalance, refetch: refetchDelegatorNative } = useBalance({
    address: delegatorAddress,
  });

  // Token transfer states
  const [tokenStates, setTokenStates] = useState<TokenTransferState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(true);

  /**
   * Initialize token states from strategy
   */
  useEffect(() => {
    const initializeTokenStates = async () => {
      if (!userAddress || !strategyTokens.length) {
        setLoadingBalances(false);
        return;
      }

      setLoadingBalances(true);
      const states: TokenTransferState[] = [];

      for (const token of strategyTokens) {
        // Get EOA balance
        let eoaBalance = 0n;
        let delegatorBalance = 0n;

        try {
          if (token.isNative) {
            eoaBalance = nativeBalance?.value || 0n;
            delegatorBalance = delegatorNativeBalance?.value || 0n;
          } else {
            eoaBalance = await getTokenBalance(token.address, userAddress, token.decimals);
            delegatorBalance = await getTokenBalance(token.address, delegatorAddress, token.decimals);
          }
        } catch (err) {
          console.error(`Failed to get balance for ${token.symbol}:`, err);
        }

        states.push({
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          isNative: token.isNative,
          amount: '',
          transferring: false,
          completed: false,
          eoaBalance,
          delegatorBalance,
        });
      }

      setTokenStates(states);
      setLoadingBalances(false);
    };

    initializeTokenStates();
  }, [strategyTokens.length, userAddress, nativeBalance, delegatorNativeBalance]);

  /**
   * Handle token transfer
   */
  const handleTransferToken = async (index: number) => {
    const token = tokenStates[index];
    if (!userAddress || !token.amount || parseFloat(token.amount) <= 0) {
      return;
    }

    try {
      // Update state to show transferring
      setTokenStates(prev =>
        prev.map((t, i) => (i === index ? { ...t, transferring: true } : t))
      );
      setError(null);

      let txHash: `0x${string}`;
      const amountWei = token.isNative
        ? parseEther(token.amount)
        : parseUnits(token.amount, token.decimals);

      if (token.isNative) {
        txHash = await transferToDeleGator(delegatorAddress, amountWei);
      } else {
        txHash = await transferTokenToDeleGator(token.address, delegatorAddress, amountWei);
      }

      // Update state with completion
      setTokenStates(prev =>
        prev.map((t, i) =>
          i === index
            ? { ...t, transferring: false, completed: true, txHash, amount: '' }
            : t
        )
      );

      // Refetch balances
      setTimeout(async () => {
        if (token.isNative) {
          await refetchNative();
          await refetchDelegatorNative();
        }

        // Refresh token balance
        const newEoaBalance = await getTokenBalance(token.address, userAddress, token.decimals);
        const newDelegatorBalance = await getTokenBalance(token.address, delegatorAddress, token.decimals);

        setTokenStates(prev =>
          prev.map((t, i) =>
            i === index
              ? { ...t, eoaBalance: newEoaBalance, delegatorBalance: newDelegatorBalance }
              : t
          )
        );
      }, 2000);

    } catch (err: any) {
      console.error(`Failed to transfer ${token.symbol}:`, err);
      setError(err.message || `Failed to transfer ${token.symbol}`);
      setTokenStates(prev =>
        prev.map((t, i) => (i === index ? { ...t, transferring: false } : t))
      );
    }
  };

  /**
   * Handle setting max amount for a token
   */
  const handleSetMax = (index: number) => {
    const token = tokenStates[index];
    if (!token.eoaBalance) return;

    let maxAmount: bigint;
    if (token.isNative) {
      // Leave gas reserve for native token
      const gasReserve = parseEther('0.01');
      maxAmount = token.eoaBalance > gasReserve ? token.eoaBalance - gasReserve : 0n;
    } else {
      maxAmount = token.eoaBalance;
    }

    const formatted = token.isNative
      ? formatEther(maxAmount)
      : formatUnits(maxAmount, token.decimals);

    setTokenStates(prev =>
      prev.map((t, i) => (i === index ? { ...t, amount: formatted } : t))
    );
  };

  /**
   * Update token amount
   */
  const handleAmountChange = (index: number, amount: string) => {
    setTokenStates(prev =>
      prev.map((t, i) => (i === index ? { ...t, amount } : t))
    );
    setError(null);
  };

  /**
   * Get block explorer URL
   */
  const getExplorerUrl = (txHash: string): string => {
    const explorerUrl = chain?.blockExplorers?.default?.url || '';
    return `${explorerUrl}/tx/${txHash}`;
  };

  if (loadingBalances) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto" />
            <div className="text-sm text-gray-600">Loading token balances...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-medium text-gray-900">Transfer Strategy Funds</h3>
        <p className="text-sm text-gray-600 mt-1">
          Transfer assets from your wallet to your DeleGator smart account to fund your strategy.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-sm">
          <strong>Strategy Tokens:</strong> Transfer all tokens used in your strategy. The bot will rebalance these assets according to your configured weights.
        </AlertDescription>
      </Alert>

      {/* Token Transfer Cards */}
      <div className="space-y-4">
        {tokenStates.map((token, index) => (
          <div key={token.address} className="border rounded-lg p-4 space-y-4">
            {/* Token Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-gray-100 p-2">
                  <Coins className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{token.symbol}</div>
                  <div className="text-xs text-gray-500">
                    {token.isNative ? 'Native Token' : 'ERC-20 Token'}
                  </div>
                </div>
              </div>
              {token.completed && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Transferred
                </Badge>
              )}
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                <div className="text-xs text-blue-700 font-medium mb-1">Your Wallet</div>
                <div className="text-lg font-bold text-blue-900">
                  {token.eoaBalance !== undefined
                    ? token.isNative
                      ? formatEther(token.eoaBalance)
                      : formatUnits(token.eoaBalance, token.decimals)
                    : '0.00'}
                </div>
                <div className="text-xs text-blue-700">{token.symbol}</div>
              </div>

              <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                <div className="text-xs text-green-700 font-medium mb-1">Smart Account</div>
                <div className="text-lg font-bold text-green-900">
                  {token.delegatorBalance !== undefined
                    ? token.isNative
                      ? formatEther(token.delegatorBalance)
                      : formatUnits(token.delegatorBalance, token.decimals)
                    : '0.00'}
                </div>
                <div className="text-xs text-green-700">{token.symbol}</div>
              </div>
            </div>

            {/* Transfer Form */}
            {!token.completed && (
              <div className="space-y-2">
                <Label htmlFor={`amount-${index}`} className="text-sm font-medium text-gray-700">
                  Amount to Transfer
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`amount-${index}`}
                    type="text"
                    placeholder="0.0"
                    value={token.amount}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    disabled={token.transferring}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleSetMax(index)}
                    disabled={token.transferring || !token.eoaBalance}
                  >
                    Max
                  </Button>
                </div>
                <Button
                  onClick={() => handleTransferToken(index)}
                  disabled={token.transferring || !token.amount || parseFloat(token.amount) <= 0}
                  className="w-full bg-gray-900 hover:bg-gray-800"
                  size="sm"
                >
                  {token.transferring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    <>
                      Transfer {token.symbol}
                      <ArrowDownUp className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Success message with tx link */}
            {token.completed && token.txHash && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-sm text-green-800">
                  Transfer successful!{' '}
                  {chain && (
                    <a
                      href={getExplorerUrl(token.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline hover:text-green-900"
                    >
                      View transaction
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* No tokens message */}
      {tokenStates.length === 0 && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            No tokens found in strategy. Please add asset blocks to your strategy canvas before proceeding.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-2 pt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={tokenStates.some(t => t.transferring)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={tokenStates.some(t => t.transferring)}
          >
            Cancel
          </Button>
        </div>
        <Button
          onClick={onNext}
          disabled={tokenStates.some(t => t.transferring)}
          className="bg-gray-900 hover:bg-gray-800"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

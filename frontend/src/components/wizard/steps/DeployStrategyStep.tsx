import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Rocket, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useStrategy } from '@/hooks/useStrategy';
import { strategiesApi } from '@/lib/api/strategies';
import { useAuth } from '@/hooks/useAuth';
import type { Strategy } from '@/lib/types/strategy';
import type { Address } from 'viem';

interface DeployStrategyStepProps {
  strategy: Strategy; // Canvas strategy to deploy
  delegatorAddress: Address; // DeleGator smart contract
  chainId: number;
  onNext: (savedStrategyId: string) => void;
  onBack: () => void;
  onCancel: () => void;
}

/**
 * DeployStrategyStep - Deploy strategy on-chain to StrategyRegistry THEN save to DB
 *
 * New flow:
 * 1. Deploy strategy on-chain to StrategyRegistry
 * 2. Get on-chain strategyId from transaction
 * 3. Save strategy to database with on-chain strategyId and delegatorAddress
 * 4. Pass DB strategyId to next step
 *
 * This ensures every DB strategy is already deployed on-chain.
 */
export function DeployStrategyStep({
  strategy,
  delegatorAddress,
  chainId,
  onNext,
  onBack,
  onCancel,
}: DeployStrategyStepProps) {
  const { convertCanvasToDto } = useStrategy(chainId);
  const { getBackendToken } = useAuth();
  const [deploying, setDeploying] = useState(false);
  const [deployedTxHash, setDeployedTxHash] = useState<string | null>(null);
  const [savedStrategyId, setSavedStrategyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setError(null);
    setDeploying(true);

    try {
      // Step 1: Validate and convert canvas strategy to DTO
      const dto = convertCanvasToDto(strategy, chainId);
      if (!dto) {
        setError('Invalid strategy configuration');
        setDeploying(false);
        return;
      }

      console.log('🚀 Step 1: Deploying strategy on-chain...');

      // Step 2: Deploy on-chain using writeContract (from useStrategy hook logic)
      const { writeContract } = await import('@wagmi/core');
      const { wagmiConfig } = await import('@/lib/wagmi');
      const { StrategyRegistryABI, getStrategyRegistryAddress } = await import('@/lib/abis/StrategyRegistry');
      const { waitForTransactionReceiptWithRetry } = await import('@/lib/utils/transaction-receipt');

      // Get contract address for this chain (with validation)
      const registryAddress = getStrategyRegistryAddress(chainId);

      // Generate on-chain strategyId (timestamp-based)
      const onChainStrategyId = BigInt(Date.now());

      // Call StrategyRegistry.createStrategy() - NEW SIGNATURE WITH DELEGATOR
      const hash = await writeContract(wagmiConfig, {
        address: registryAddress,
        abi: StrategyRegistryABI,
        functionName: 'createStrategy',
        args: [
          delegatorAddress, // First parameter: DeleGator smart account address
          onChainStrategyId,
          dto.tokens.map(t => t as `0x${string}`),
          dto.weights,
          BigInt(dto.rebalanceInterval),
          strategy.name || `Strategy ${onChainStrategyId}`,
        ],
      });

      console.log(`⏳ Waiting for confirmation... Tx: ${hash}`);

      // Wait for confirmation with retry logic (3 attempts, 3s delay)
      const receipt = await waitForTransactionReceiptWithRetry(wagmiConfig, hash, 3, 3000);

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      setDeployedTxHash(hash);
      console.log(`✅ Step 2: Strategy deployed on-chain with ID ${onChainStrategyId}`);

      // Step 3: Get backend token (will trigger SIWE if needed)
      console.log('🔐 Step 3: Authenticating with backend...');
      const token = await getBackendToken();
      if (!token) {
        throw new Error(
          'Backend authentication required. Please click the "Login" button in the top right to authenticate with Privy, then try deploying again.'
        );
      }

      // Step 4: Save to database with delegatorAddress, on-chain strategyId, AND deployTxHash
      console.log('💾 Step 4: Saving strategy to database with on-chain strategyId and tx hash...');

      const dbStrategy = await strategiesApi.createStrategy(
        {
          ...dto,
          strategyId: onChainStrategyId.toString(), // Pass the on-chain strategyId
          deployTxHash: hash, // Pass the deployment transaction hash
          delegatorAddress: delegatorAddress.toLowerCase(),
        },
        token
      );

      setSavedStrategyId(dbStrategy.id);
      console.log(`✅ Step 5: Strategy saved with ID ${dbStrategy.id} and DeleGator ${delegatorAddress}`);

    } catch (err: any) {
      console.error('❌ Deploy error:', err);
      setError(err.message || 'Failed to deploy strategy');
    } finally {
      setDeploying(false);
    }
  };

  const handleContinue = () => {
    if (savedStrategyId) {
      onNext(savedStrategyId);
    }
  };

  const getExplorerUrl = (txHash: string) => {
    if (chainId === 10143) {
      return `https://testnet.monadexplorer.com/tx/${txHash}`;
    } else if (chainId === 84532) {
      return `https://sepolia.basescan.org/tx/${txHash}`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Rocket className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <div className="font-medium text-blue-900 text-sm">Deploy Strategy On-Chain</div>
            <div className="text-blue-700 text-sm leading-relaxed">
              Your strategy needs to be registered on the blockchain so the bot can execute
              rebalances. This creates a permanent record in the StrategyRegistry contract
              and validates ownership against your DeleGator.
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Info */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="text-sm font-medium text-gray-700 mb-3">Strategy Details</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium">{strategy.name || 'Unnamed Strategy'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Assets:</span>
            <span>
              {strategy.blocks.filter(b => b.type === 'asset').length} assets
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rebalance Interval:</span>
            <span>
              {(() => {
                const actionBlock = strategy.blocks.find(
                  b => b.type === 'action' && (b.data as any).actionType === 'rebalance'
                );
                const interval = (actionBlock?.data as any)?.rebalanceTrigger?.interval || 60;
                return `${interval} minutes`;
              })()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Chain:</span>
            <span>{chainId === 10143 ? 'Monad Testnet' : 'Base Sepolia'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">DeleGator:</span>
            <span className="font-mono text-xs">
              {delegatorAddress.slice(0, 6)}...{delegatorAddress.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      {/* Deployment Status */}
      {deployedTxHash ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="font-medium text-green-900 text-sm">Strategy Deployed Successfully!</div>
              <div className="text-green-700 text-sm">
                Your strategy has been registered on-chain and is ready for automated execution.
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-green-600 font-mono break-all">
                  {deployedTxHash.slice(0, 10)}...{deployedTxHash.slice(-8)}
                </span>
                {getExplorerUrl(deployedTxHash) && (
                  <a
                    href={getExplorerUrl(deployedTxHash)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="font-medium text-orange-900 text-sm">Action Required</div>
              <div className="text-orange-700 text-sm leading-relaxed">
                Click "Deploy Strategy" to register your strategy on-chain. This requires a
                blockchain transaction that you'll need to approve in your wallet.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-900 text-sm">Deployment Failed</div>
              <div className="text-red-700 text-sm mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button onClick={onBack} variant="outline" disabled={deploying}>
          Back
        </Button>

        <div className="flex gap-2">
          <Button onClick={onCancel} variant="ghost" disabled={deploying}>
            Cancel
          </Button>

          {!savedStrategyId ? (
            <Button
              onClick={handleDeploy}
              disabled={deploying}
              className="min-w-[140px]"
            >
              {deploying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Strategy
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleContinue} className="min-w-[140px]">
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

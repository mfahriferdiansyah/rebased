import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Info,
  ExternalLink,
  Wallet,
  Shield,
  ArrowDownUp,
  Sparkles,
} from 'lucide-react';
import { useChainId } from 'wagmi';
import { getChainById } from '@/lib/chains';
import type { Address } from 'viem';

interface ConfirmationStepProps {
  delegatorAddress: Address;
  onFinish: () => void;
}

/**
 * ConfirmationStep Component
 *
 * Final step of Strategy Setup Wizard
 * - Shows summary of setup
 * - Confirms everything is ready
 * - Provides next steps
 */
export function ConfirmationStep({
  delegatorAddress,
  onFinish,
}: ConfirmationStepProps) {
  const chainId = useChainId();
  const chain = getChainById(chainId);

  const explorerUrl = chain?.blockExplorers?.default?.url;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-3 py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Setup Complete!</h3>
          <p className="text-sm text-gray-600 mt-1">
            Your strategy is ready for automated execution
          </p>
        </div>
      </div>

      {/* Setup Summary */}
      <div className="border rounded-lg divide-y">
        {/* Smart Account */}
        <div className="p-4 flex items-start gap-3">
          <div className="rounded-full bg-green-100 p-2">
            <Wallet className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Smart Account</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mt-1 break-all">
              {delegatorAddress}
            </div>
            {explorerUrl && (
              <a
                href={`${explorerUrl}/address/${delegatorAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
              >
                View on explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Funds Transferred */}
        <div className="p-4 flex items-start gap-3">
          <div className="rounded-full bg-green-100 p-2">
            <ArrowDownUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Funds</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Strategy funds are in your smart account
            </div>
          </div>
        </div>

        {/* Delegation */}
        <div className="p-4 flex items-start gap-3">
          <div className="rounded-full bg-green-100 p-2">
            <Shield className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Delegation</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Signed
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Bot authorized to execute rebalances
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1 space-y-3">
            <h4 className="font-medium text-blue-900">What Happens Next?</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-900">1</span>
                </div>
                <span>
                  The bot will monitor your strategy and portfolio drift
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-900">2</span>
                </div>
                <span>
                  When drift exceeds your threshold, it will execute a rebalance
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-900">3</span>
                </div>
                <span>
                  You'll receive notifications for all rebalance operations
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-900">4</span>
                </div>
                <span>
                  Track performance and history in your strategy dashboard
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Important Information */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-sm space-y-2">
          <div>
            <strong>Important:</strong>
          </div>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Your funds remain in your smart account at all times</li>
            <li>You can revoke the delegation anytime from Delegation Manager</li>
            <li>Pause or modify your strategy settings as needed</li>
            <li>Monitor all transactions on the blockchain explorer</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onFinish}
          size="lg"
          className="bg-gray-900 hover:bg-gray-800 px-8"
        >
          Manage Delegation
        </Button>
      </div>

      {/* Footer Help */}
      <div className="text-center text-xs text-gray-500">
        Need help? Check our{' '}
        <a href="#" className="text-blue-600 hover:text-blue-700 underline">
          documentation
        </a>{' '}
        or{' '}
        <a href="#" className="text-blue-600 hover:text-blue-700 underline">
          contact support
        </a>
      </div>
    </div>
  );
}

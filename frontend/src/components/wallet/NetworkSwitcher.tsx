import { useSwitchChain, useChainId } from 'wagmi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supportedChains, getChainById } from '@/lib/chains';
import { toast } from 'sonner';
import { getChainLogoUrl } from '@/lib/utils/token-logo';

/**
 * Network Switcher Component
 *
 * Dynamically displays all supported chains from chains.ts configuration
 * PRODUCTION: Only Base Mainnet
 * DEVELOPMENT: Multiple chains if enabled
 */
export function NetworkSwitcher() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  

  const currentChain = getChainById(chainId);

  const handleChainSwitch = (newChainId: string) => {
    const targetChainId = parseInt(newChainId);

    switchChain(
      { chainId: targetChainId },
      {
        onSuccess: () => {
          const chain = getChainById(targetChainId);
          toast.success('Network switched', {
            description: `Switched to ${chain?.name}`,
          });
        },
        onError: (error) => {
          toast.error('Network switch failed', {
            description: error.message,
          });
        },
      }
    );
  };

  // Get short name
  const getShortName = (name: string | undefined) => {
    if (!name) return 'Network';
    // Remove "Testnet" and "Sepolia" for compact display
    return name.replace(' Testnet', '').replace(' Sepolia', '');
  };

  // If only one chain is supported, show it without dropdown (production mode)
  if (supportedChains.length === 1) {
    return (
      <div className="h-9 px-3 py-2 border border-gray-300 bg-white rounded-md">
        <div className="flex items-center gap-2">
          {chainId && (
            <img
              src={getChainLogoUrl(chainId)}
              alt={currentChain?.name || 'Network'}
              className="w-4 h-4 rounded-full flex-shrink-0"
            />
          )}
          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
            {getShortName(currentChain?.name)}
          </span>
        </div>
      </div>
    );
  }

  // Multiple chains - show dropdown (development mode)
  return (
    <Select
      value={chainId?.toString()}
      onValueChange={handleChainSwitch}
      disabled={isPending}
    >
      <SelectTrigger className="h-9 border-gray-300 bg-white hover:bg-gray-50 transition-colors">
        <SelectValue>
          {isPending ? (
            <span className="text-sm text-gray-600">Switching...</span>
          ) : (
            <div className="flex items-center gap-2">
              {chainId && (
                <img
                  src={getChainLogoUrl(chainId)}
                  alt={currentChain?.name || 'Network'}
                  className="w-4 h-4 rounded-full flex-shrink-0"
                />
              )}
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {getShortName(currentChain?.name)}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {supportedChains.map((chain) => (
          <SelectItem key={chain.id} value={chain.id.toString()}>
            <div className="flex items-center gap-2">
              <img
                src={getChainLogoUrl(chain.id)}
                alt={chain.name}
                className="w-4 h-4 rounded-full"
              />
              <span className="text-sm">{chain.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, X, Lock } from 'lucide-react';
import { tokensApi } from '@/lib/api';
import { Token } from '@/lib/types/token';
import { toast } from 'sonner';
import { TokenIcon } from '@/components/ui/token-icon';
import { getChainLogoUrl } from '@/lib/utils/token-logo';

interface TokenSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTokens: Token[];
  onTokensSelected: (tokens: Token[]) => void;
}

export function TokenSelectionModal({
  open,
  onOpenChange,
  selectedTokens,
  onTokensSelected,
}: TokenSelectionModalProps) {
  

  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [networkSearch, setNetworkSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('all');

  // Define available networks - using actual chain logos, NO emojis
  const networks = [
    { id: 'all', name: 'All networks', logoUrl: null, locked: false },
    { id: '10143', name: 'Monad Testnet', logoUrl: getChainLogoUrl(10143), locked: false },
    { id: '84532', name: 'Base Sepolia', logoUrl: getChainLogoUrl(84532), locked: true },
  ];

  // Filter networks based on search
  const filteredNetworks = networks.filter((network) =>
    network.name.toLowerCase().includes(networkSearch.toLowerCase())
  );

  // Fetch tokens when modal opens or chain filter changes
  useEffect(() => {
    if (open) {
      fetchTokens();
    }
  }, [open, selectedChainFilter]);

  // Filter tokens based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTokens(tokens);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tokens.filter(
        (token) =>
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query)
      );
      setFilteredTokens(filtered);
    }
  }, [searchQuery, tokens]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      // ONLY fetch Monad tokens (10143) - Base is coming soon
      const chainIds = selectedChainFilter === 'all' ? [10143] : Number(selectedChainFilter);
      const response = await tokensApi.getTokens(chainIds);
      setTokens(response.tokens);
      setFilteredTokens(response.tokens);
    } catch (error) {
      toast.error('Error fetching tokens', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (token: Token) => {
    // Instant selection - no confirmation needed
    onTokensSelected([token]);
    onOpenChange(false);
  };

  const handleNetworkSelect = (networkId: string) => {
    setSelectedChainFilter(networkId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-gray-300">
          <DialogTitle className="text-lg font-semibold text-gray-900">Select token</DialogTitle>
        </DialogHeader>

        {/* Two-column layout */}
        <div className="flex h-[600px]">
          {/* Left column: Token list */}
          <div className="flex-1 flex flex-col">
            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-gray-300">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, symbol or address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-11 border-gray-200 focus:border-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Token List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredTokens.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p className="text-sm font-medium">No tokens found</p>
                  {searchQuery && (
                    <p className="text-xs mt-1.5">Try adjusting your search</p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-2">
                  {filteredTokens.map((token) => (
                    <div
                      key={`${token.chainId}-${token.address}`}
                      className="flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 cursor-pointer hover:bg-gray-100 hover:shadow-sm active:scale-[0.98] border border-transparent hover:border-gray-200"
                      onClick={() => handleTokenSelect(token)}
                    >
                      {/* Token Icon */}
                      <TokenIcon
                        address={token.address}
                        chainId={token.chainId}
                        symbol={token.symbol}
                        logoUri={token.logoUri}
                        size={40}
                        showChainBadge={true}
                      />

                      {/* Token Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{token.symbol}</div>
                        <div className="text-xs text-gray-500 truncate">{token.name}</div>
                      </div>

                      {/* Token Address */}
                      <div className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">
                        {token.address.slice(0, 4)}...{token.address.slice(-4)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right column: Network filter */}
          <div className="w-56 flex flex-col border-l border-gray-300 bg-gray-50">
            {/* Network Search */}
            <div className="px-4 py-4 border-b border-gray-300">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search"
                  value={networkSearch}
                  onChange={(e) => setNetworkSearch(e.target.value)}
                  className="pl-9 pr-3 h-9 text-sm border-gray-200"
                />
              </div>
            </div>

            {/* Network List */}
            <div className="px-3 py-2 space-y-0.5">
              {filteredNetworks.map((network) => {
                const isSelected = selectedChainFilter === network.id;
                const isLocked = network.locked;
                return (
                  <button
                    key={network.id}
                    onClick={() => !isLocked && handleNetworkSelect(network.id)}
                    disabled={isLocked}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all ${
                      isLocked
                        ? 'cursor-not-allowed opacity-50'
                        : isSelected
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    {/* Chain logo - actual image, NO emoji */}
                    {network.logoUrl ? (
                      <img
                        src={network.logoUrl}
                        alt={network.name}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-gray-700' : 'bg-gray-300'
                      }`}>
                        <span className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-600'}`}>●</span>
                      </div>
                    )}
                    {/* Chain name - white when selected, gray otherwise */}
                    <span className="text-sm font-medium flex-1">
                      {network.name}
                    </span>
                    {/* Lock icon and "Soon" badge for locked networks */}
                    {isLocked && (
                      <div className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                          SOON
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

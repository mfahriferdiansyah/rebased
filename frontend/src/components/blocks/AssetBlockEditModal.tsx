import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown } from 'lucide-react';
import { Token } from '@/lib/types/token';
import { AssetBlock } from '@/lib/types/blocks';
import { TokenSelectionModal } from '../strategy/TokenSelectionModal';
import { useToast } from '@/hooks/use-toast';
import { TokenIcon } from '@/components/ui/token-icon';

interface AssetBlockEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockData?: AssetBlock['data'];
  onSave: (data: AssetBlock['data']) => void;
}

export function AssetBlockEditModal({
  open,
  onOpenChange,
  blockData,
  onSave,
}: AssetBlockEditModalProps) {
  const { toast } = useToast();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [weight, setWeight] = useState(blockData?.initialWeight || 50);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Initialize from blockData when editing
  useEffect(() => {
    if (open && blockData) {
      // Convert blockData back to Token format for editing
      const token: Token = {
        address: blockData.address,
        symbol: blockData.symbol,
        name: blockData.name,
        chainId: blockData.chainId,
        decimals: blockData.decimals,
        logoUri: blockData.logoUri,
      };
      setSelectedToken(token);
      setWeight(blockData.initialWeight);
    } else if (open) {
      // Reset for new block
      setSelectedToken(null);
      setWeight(50);
    }
  }, [open, blockData]);

  const handleTokenSelect = (tokens: Token[]) => {
    if (tokens.length > 0) {
      setSelectedToken(tokens[0]); // Take first token (single select)
    }
  };

  const handleWeightChange = (value: number[]) => {
    setWeight(value[0]);
  };

  const handleInputChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setWeight(Math.max(0, Math.min(100, numValue)));
    }
  };

  const handleSave = () => {
    if (!selectedToken) {
      toast({
        title: 'No token selected',
        description: 'Please select a token first',
        variant: 'destructive',
      });
      return;
    }

    if (weight <= 0) {
      toast({
        title: 'Invalid weight',
        description: 'Weight must be greater than 0%',
        variant: 'destructive',
      });
      return;
    }

    const data: AssetBlock['data'] = {
      symbol: selectedToken.symbol,
      name: selectedToken.name,
      address: selectedToken.address,
      chainId: selectedToken.chainId,
      decimals: selectedToken.decimals,
      logoUri: selectedToken.logoUri,
      initialWeight: weight,
    };

    onSave(data);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedToken(null);
    setWeight(50);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showTokenModal} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-300">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {blockData ? 'Edit Asset' : 'Add Asset'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 p-6 pb-3 pt-3">
            {/* Token Selection - Clickable */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setShowTokenModal(true)}
                className="w-full flex items-center gap-3 p-3.5 border border-gray-300 rounded-lg bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left"
              >
                {selectedToken ? (
                  <>
                    <TokenIcon
                      address={selectedToken.address}
                      chainId={selectedToken.chainId}
                      symbol={selectedToken.symbol}
                      logoUri={selectedToken.logoUri}
                      size={40}
                      showChainBadge={true}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{selectedToken.symbol}</div>
                      <div className="text-sm text-gray-500 truncate">{selectedToken.name}</div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-lg">?</span>
                    </div>
                    <span className="flex-1 text-gray-500 text-sm">Select a token</span>
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </>
                )}
              </button>
            </div>

            {/* Weight Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="weight" className="text-sm font-medium text-gray-900">
                  Allocation
                </Label>
                <Slider
                  value={[weight]}
                  onValueChange={handleWeightChange}
                  max={100}
                  step={1}
                  className="py-4"
                />
                <div className="flex items-center gap-2">
                  <Input
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={(e) => handleInputChange(e.target.value)}
                    min={0}
                    max={100}
                    className="w-20 text-right h-9 border-gray-200"
                  />
                  <span className="text-sm text-gray-500 font-medium">%</span>
                </div>
              </div>

              <div className="text-center pt-1">
                <div className="text-6xl font-bold text-gray-900 tracking-tight">
                  {weight}%
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 p-6 border-t border-gray-300">
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedToken || weight <= 0}
              className="h-10 px-4 bg-gray-900 hover:bg-gray-800"
            >
              <Check className="w-4 h-4 mr-2" />
              {blockData ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Selection Modal */}
      <TokenSelectionModal
        open={showTokenModal}
        onOpenChange={setShowTokenModal}
        selectedTokens={selectedToken ? [selectedToken] : []}
        onTokensSelected={handleTokenSelect}
      />
    </>
  );
}

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown, ArrowRight } from 'lucide-react';
import { Token } from '@/lib/types/token';
import { ActionBlock } from '@/lib/types/blocks';
import { TokenSelectionModal } from '../strategy/TokenSelectionModal';
import { toast } from 'sonner';
import { TokenIcon } from '@/components/ui/token-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ActionBlockEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockData?: ActionBlock['data'];
  onSave: (data: ActionBlock['data']) => void;
}

export function ActionBlockEditModal({
  open,
  onOpenChange,
  blockData,
  onSave,
}: ActionBlockEditModalProps) {
  

  const [actionType, setActionType] = useState<"rebalance" | "swap" | "transfer">(
    blockData?.actionType || 'rebalance'
  );

  // Rebalance state
  const [intervalValue, setIntervalValue] = useState<string>(
    blockData?.rebalanceTrigger?.interval?.toString() || ''
  );
  const [driftValue, setDriftValue] = useState<string>(
    blockData?.rebalanceTrigger?.drift?.toString() || ''
  );

  // Swap state
  const [swapFrom, setSwapFrom] = useState<Token | null>(blockData?.swapFrom || null);
  const [swapTo, setSwapTo] = useState<Token | null>(blockData?.swapTo || null);
  const [swapAmount, setSwapAmount] = useState<string>(blockData?.swapAmount?.toString() || '');
  const [showSwapFromModal, setShowSwapFromModal] = useState(false);
  const [showSwapToModal, setShowSwapToModal] = useState(false);

  // Transfer state
  const [transferAsset, setTransferAsset] = useState<Token | null>(blockData?.transferAsset || null);
  const [transferTo, setTransferTo] = useState<string>(blockData?.transferTo || '');
  const [transferAmount, setTransferAmount] = useState<string>(blockData?.transferAmount?.toString() || '');
  const [showTransferAssetModal, setShowTransferAssetModal] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (open && blockData) {
      setActionType(blockData.actionType);
      if (blockData.rebalanceTrigger) {
        setIntervalValue(blockData.rebalanceTrigger.interval.toString());
        setDriftValue(blockData.rebalanceTrigger.drift?.toString() || '');
      }
      setSwapFrom(blockData.swapFrom || null);
      setSwapTo(blockData.swapTo || null);
      setSwapAmount(blockData.swapAmount?.toString() || '');
      setTransferAsset(blockData.transferAsset || null);
      setTransferTo(blockData.transferTo || '');
      setTransferAmount(blockData.transferAmount?.toString() || '');
    } else if (open) {
      setActionType('rebalance');
      setIntervalValue('');
      setDriftValue('');
      setSwapFrom(null);
      setSwapTo(null);
      setSwapAmount('');
      setTransferAsset(null);
      setTransferTo('');
      setTransferAmount('');
    }
  }, [open, blockData]);

  const handleSave = () => {
    let data: ActionBlock['data'];

    if (actionType === 'rebalance') {
      const interval = parseFloat(intervalValue);
      if (isNaN(interval) || interval < 1) {
        toast.error('Invalid interval', {
          description: 'Please enter a valid interval of at least 1 minute',
        });
        return;
      }

      // Drift is optional - only set if value is provided and > 0
      let drift: number | undefined = undefined;
      if (driftValue && driftValue.trim() !== '') {
        const driftNum = parseFloat(driftValue);
        if (isNaN(driftNum) || driftNum <= 0) {
          toast.error('Invalid drift threshold', {
            description: 'Please enter a valid drift percentage greater than 0, or leave empty for no threshold',
          });
          return;
        }
        drift = driftNum;
      }

      // Build description
      let description = `Rebalance every ${interval} min`;
      if (drift) {
        description += ` if drift > ${drift}%`;
      }

      data = {
        actionType: 'rebalance',
        rebalanceTrigger: {
          interval,
          drift,
        },
        description,
      };
    } else if (actionType === 'swap') {
      if (!swapFrom || !swapTo) {
        toast.error('Tokens required', {
          description: 'Please select both tokens for the swap',
        });
        return;
      }

      const amount = parseFloat(swapAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Invalid amount', {
          description: 'Please enter a valid amount greater than 0',
        });
        return;
      }

      data = {
        actionType: 'swap',
        swapFrom,
        swapTo,
        swapAmount: amount,
        description: `Swap ${amount} ${swapFrom.symbol} → ${swapTo.symbol}`,
      };
    } else {
      // transfer
      if (!transferAsset) {
        toast.error('Asset required', {
          description: 'Please select an asset to transfer',
        });
        return;
      }

      if (!transferTo || !/^0x[a-fA-F0-9]{40}$/.test(transferTo)) {
        toast.error('Invalid address', {
          description: 'Please enter a valid Ethereum address',
        });
        return;
      }

      const amount = parseFloat(transferAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Invalid amount', {
          description: 'Please enter a valid amount greater than 0',
        });
        return;
      }

      data = {
        actionType: 'transfer',
        transferAsset,
        transferTo,
        transferAmount: amount,
        description: `Transfer ${amount} ${transferAsset.symbol} to ${transferTo.slice(0, 6)}...${transferTo.slice(-4)}`,
      };
    }

    onSave(data);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showSwapFromModal && !showSwapToModal && !showTransferAssetModal} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-300">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {blockData ? 'Edit Action' : 'Add Action'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={actionType} onValueChange={(value: any) => setActionType(value)} className="w-full">
            <TabsList className="w-full grid grid-cols-3 mx-6 mt-4" style={{ width: 'calc(100% - 3rem)' }}>
              <TabsTrigger value="rebalance" className="text-sm">Rebalance</TabsTrigger>
              <TabsTrigger value="swap" className="text-sm">Swap</TabsTrigger>
              <TabsTrigger value="transfer" className="text-sm">Transfer</TabsTrigger>
            </TabsList>

            {/* REBALANCE TAB */}
            <TabsContent value="rebalance" className="space-y-4 p-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intervalValue" className="text-sm font-medium text-gray-900">
                    Interval (min) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="intervalValue"
                    type="number"
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    placeholder="12"
                    className="h-11 border-gray-300"
                    step="1"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driftValue" className="text-sm font-medium text-gray-900">
                    Drift (%) <span className="text-gray-400 text-xs">optional</span>
                  </Label>
                  <Input
                    id="driftValue"
                    type="number"
                    value={driftValue}
                    onChange={(e) => setDriftValue(e.target.value)}
                    placeholder="0"
                    className="h-11 border-gray-300"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Rebalance every X minutes. Add drift threshold to trigger early when portfolio drifts by X% from target.
              </p>
            </TabsContent>

            {/* SWAP TAB */}
            <TabsContent value="swap" className="space-y-4 p-6 mt-4">
              {/* Token Selection Row */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Tokens <span className="text-red-500">*</span></Label>
                <div className="flex items-stretch gap-2">
                  {/* From Token */}
                  <button
                    type="button"
                    onClick={() => setShowSwapFromModal(true)}
                    className="flex-1 flex items-center gap-2 p-2.5 border border-gray-300 rounded-lg bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left"
                  >
                    {swapFrom ? (
                      <>
                        <TokenIcon
                          address={swapFrom.address}
                          chainId={swapFrom.chainId}
                          symbol={swapFrom.symbol}
                          logoUri={swapFrom.logoUri}
                          size={28}
                          showChainBadge={true}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate text-sm">{swapFrom.symbol}</div>
                          <div className="text-xs text-gray-500 truncate">{swapFrom.name}</div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </>
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400">?</span>
                        </div>
                        <span className="flex-1 text-gray-500 text-sm">From</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </>
                    )}
                  </button>

                  {/* Arrow */}
                  <div className="flex items-center justify-center px-1">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* To Token */}
                  <button
                    type="button"
                    onClick={() => setShowSwapToModal(true)}
                    className="flex-1 flex items-center gap-2 p-2.5 border border-gray-300 rounded-lg bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left"
                  >
                    {swapTo ? (
                      <>
                        <TokenIcon
                          address={swapTo.address}
                          chainId={swapTo.chainId}
                          symbol={swapTo.symbol}
                          logoUri={swapTo.logoUri}
                          size={28}
                          showChainBadge={true}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate text-sm">{swapTo.symbol}</div>
                          <div className="text-xs text-gray-500 truncate">{swapTo.name}</div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </>
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400">?</span>
                        </div>
                        <span className="flex-1 text-gray-500 text-sm">To</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="swapAmount" className="text-sm font-medium text-gray-900">
                  Amount {swapFrom && `(${swapFrom.symbol})`} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="swapAmount"
                  type="number"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-11 border-gray-300"
                  step="0.01"
                  min="0"
                />
              </div>
            </TabsContent>

            {/* TRANSFER TAB */}
            <TabsContent value="transfer" className="space-y-4 p-6 mt-4">
              {/* Asset Selection - Full Width */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Asset <span className="text-red-500">*</span></Label>
                <button
                  type="button"
                  onClick={() => setShowTransferAssetModal(true)}
                  className="w-full flex items-center gap-2.5 p-2.5 border border-gray-300 rounded-lg bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left"
                >
                  {transferAsset ? (
                    <>
                      <TokenIcon
                        address={transferAsset.address}
                        chainId={transferAsset.chainId}
                        symbol={transferAsset.symbol}
                        logoUri={transferAsset.logoUri}
                        size={28}
                        showChainBadge={true}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{transferAsset.symbol}</div>
                        <div className="text-xs text-gray-500 truncate">{transferAsset.name}</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400">?</span>
                      </div>
                      <span className="flex-1 text-gray-500 text-sm">Select asset</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </>
                  )}
                </button>
              </div>

              {/* Address + Amount Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transferTo" className="text-sm font-medium text-gray-900">
                    To Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="transferTo"
                    type="text"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="0x..."
                    className="h-11 border-gray-300 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transferAmount" className="text-sm font-medium text-gray-900">
                    Amount {transferAsset && `(${transferAsset.symbol})`} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="transferAmount"
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-11 border-gray-300"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

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
              className="h-10 px-4 bg-gray-900 hover:bg-gray-800"
            >
              <Check className="w-4 h-4 mr-2" />
              {blockData ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Selection Modals */}
      <TokenSelectionModal
        open={showSwapFromModal}
        onOpenChange={setShowSwapFromModal}
        selectedTokens={swapFrom ? [swapFrom] : []}
        onTokensSelected={(tokens) => tokens.length > 0 && setSwapFrom(tokens[0])}
      />
      <TokenSelectionModal
        open={showSwapToModal}
        onOpenChange={setShowSwapToModal}
        selectedTokens={swapTo ? [swapTo] : []}
        onTokensSelected={(tokens) => tokens.length > 0 && setSwapTo(tokens[0])}
      />
      <TokenSelectionModal
        open={showTransferAssetModal}
        onOpenChange={setShowTransferAssetModal}
        selectedTokens={transferAsset ? [transferAsset] : []}
        onTokensSelected={(tokens) => tokens.length > 0 && setTransferAsset(tokens[0])}
      />
    </>
  );
}

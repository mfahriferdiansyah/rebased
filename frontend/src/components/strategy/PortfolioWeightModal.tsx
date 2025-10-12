import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { Token } from '@/lib/types/token';
import { toast } from 'sonner';

export interface TokenWeight {
  token: Token;
  weight: number; // Percentage (0-100)
}

interface PortfolioWeightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokens: Token[];
  onWeightsConfirmed: (weights: TokenWeight[]) => void;
  initialWeights?: TokenWeight[];
}

export function PortfolioWeightModal({
  open,
  onOpenChange,
  tokens,
  onWeightsConfirmed,
  initialWeights,
}: PortfolioWeightModalProps) {
  
  const [weights, setWeights] = useState<TokenWeight[]>([]);

  // Initialize weights when modal opens
  useEffect(() => {
    if (open) {
      if (initialWeights && initialWeights.length === tokens.length) {
        setWeights(initialWeights);
      } else {
        // Equal distribution by default
        const equalWeight = Math.floor(100 / tokens.length);
        const remainder = 100 - equalWeight * tokens.length;

        setWeights(
          tokens.map((token, index) => ({
            token,
            weight: index === 0 ? equalWeight + remainder : equalWeight,
          }))
        );
      }
    }
  }, [open, tokens, initialWeights]);

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  const isValid = totalWeight === 100;

  const updateWeight = (index: number, newWeight: number) => {
    const updated = [...weights];
    updated[index].weight = Math.max(0, Math.min(100, newWeight));
    setWeights(updated);
  };

  const handleInputChange = (index: number, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      updateWeight(index, numValue);
    }
  };

  const handleSliderChange = (index: number, value: number[]) => {
    updateWeight(index, value[0]);
  };

  const handleEqualDistribution = () => {
    const equalWeight = Math.floor(100 / weights.length);
    const remainder = 100 - equalWeight * weights.length;

    setWeights(
      weights.map((w, index) => ({
        ...w,
        weight: index === 0 ? equalWeight + remainder : equalWeight,
      }))
    );
  };

  const handleConfirm = () => {
    if (!isValid) {
      toast.error('Invalid weights', {
        description: 'Total weight must equal 100%',
      });
      return;
    }

    onWeightsConfirmed(weights);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Configure Portfolio Weights</DialogTitle>
          <DialogDescription>
            Adjust the percentage allocation for each token. Total must equal 100%.
          </DialogDescription>
        </DialogHeader>

        {/* Weight Summary */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-600" />
            <span className="font-semibold">Total Weight</span>
          </div>
          <div
            className={`text-2xl font-bold ${
              isValid ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {totalWeight}%
          </div>
        </div>

        {!isValid && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>
              Total weight is {totalWeight}%. Please adjust weights to equal 100%.
            </span>
          </div>
        )}

        {/* Token Weights */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {weights.map((weightData, index) => (
              <div
                key={`${weightData.token.chainId}-${weightData.token.address}`}
                className="p-4 border rounded-lg"
              >
                {/* Token Header */}
                <div className="flex items-center gap-3 mb-4">
                  {weightData.token.logoUri ? (
                    <img
                      src={weightData.token.logoUri}
                      alt={weightData.token.symbol}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
                      {weightData.token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {weightData.token.symbol}
                    </div>
                    <div className="text-sm text-gray-500">
                      {weightData.token.name}
                    </div>
                  </div>
                </div>

                {/* Weight Controls */}
                <div className="space-y-3">
                  <Label htmlFor={`weight-${index}`}>
                    Allocation: {weightData.weight}%
                  </Label>

                  {/* Slider */}
                  <Slider
                    id={`weight-${index}`}
                    value={[weightData.weight]}
                    onValueChange={(value) => handleSliderChange(index, value)}
                    max={100}
                    step={1}
                    className="py-2"
                  />

                  {/* Input */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={weightData.weight}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      min={0}
                      max={100}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleEqualDistribution}>
            Equal Distribution
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!isValid}>
              Confirm Weights
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

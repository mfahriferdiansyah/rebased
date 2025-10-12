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
import { Check } from 'lucide-react';
import { ConditionBlock } from '@/lib/types/blocks';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ConditionBlockEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockData?: ConditionBlock['data'];
  onSave: (data: ConditionBlock['data']) => void;
}

export function ConditionBlockEditModal({
  open,
  onOpenChange,
  blockData,
  onSave,
}: ConditionBlockEditModalProps) {
  

  const [conditionType, setConditionType] = useState<"price" | "portfolioValue" | "assetValue">(
    blockData?.conditionType || 'price'
  );
  const [operator, setOperator] = useState<"GT" | "LT">(blockData?.operator || 'GT');
  const [valueUSD, setValueUSD] = useState<string>(blockData?.valueUSD?.toString() || '');

  // Reset when modal opens
  useEffect(() => {
    if (open && blockData) {
      setConditionType(blockData.conditionType);
      setOperator(blockData.operator);
      setValueUSD(blockData.valueUSD.toString());
    } else if (open) {
      setConditionType('price');
      setOperator('GT');
      setValueUSD('');
    }
  }, [open, blockData]);

  const handleSave = () => {
    // Validation
    const value = parseFloat(valueUSD);
    if (isNaN(value) || value <= 0) {
      toast.error('Invalid value', {
        description: 'Please enter a valid USD value greater than 0',
      });
      return;
    }

    // Generate description
    let description = 'If ';
    if (conditionType === 'price') {
      description += 'Asset Price';
    } else if (conditionType === 'portfolioValue') {
      description += 'Total Portfolio Value';
    } else if (conditionType === 'assetValue') {
      description += 'Asset Value';
    }
    description += operator === 'GT' ? ' > ' : ' < ';
    description += `$${value.toLocaleString()}`;

    const data: ConditionBlock['data'] = {
      conditionType,
      operator,
      valueUSD: value,
      description,
    };

    onSave(data);
    onOpenChange(false);
  };

  const handleClose = () => {
    setConditionType('price');
    setOperator('GT');
    setValueUSD('');
    onOpenChange(false);
  };

  // Generate preview text
  const getPreviewText = () => {
    let text = 'If ';
    if (conditionType === 'price') {
      text += 'Asset Price';
    } else if (conditionType === 'portfolioValue') {
      text += 'Total Portfolio Value';
    } else if (conditionType === 'assetValue') {
      text += 'Asset Value';
    }
    text += operator === 'GT' ? ' is more than ' : ' is less than ';
    text += valueUSD ? `$${parseFloat(valueUSD).toLocaleString()}` : '$[Amount]';
    return text;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-gray-300">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {blockData ? 'Edit Condition' : 'Add Condition'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Condition Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">Condition Type</Label>
            <Select value={conditionType} onValueChange={(value: any) => setConditionType(value)}>
              <SelectTrigger className="h-11 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Asset Price (USD)</SelectItem>
                <SelectItem value="portfolioValue">Total Portfolio Value (USD)</SelectItem>
                <SelectItem value="assetValue">Asset Value (USD)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Connect assets to this condition to define which assets it applies to
            </p>
          </div>

          {/* Operator */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">Operator</Label>
            <Select value={operator} onValueChange={(value: any) => setOperator(value)}>
              <SelectTrigger className="h-11 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GT">More than (&gt;)</SelectItem>
                <SelectItem value="LT">Less than (&lt;)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* USD Value */}
          <div className="space-y-2">
            <Label htmlFor="valueUSD" className="text-sm font-medium text-gray-900">
              Value (USD)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <Input
                id="valueUSD"
                type="number"
                value={valueUSD}
                onChange={(e) => setValueUSD(e.target.value)}
                placeholder="0.00"
                className="pl-7 h-11 border-gray-300"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Preview
            </div>
            <div className="text-sm text-gray-900 font-medium">
              {getPreviewText()}
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
            disabled={!valueUSD}
            className="h-10 px-4 bg-gray-900 hover:bg-gray-800"
          >
            <Check className="w-4 h-4 mr-2" />
            {blockData ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

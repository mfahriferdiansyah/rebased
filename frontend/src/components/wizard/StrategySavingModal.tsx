import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Database,
  ArrowRight,
} from 'lucide-react';
import { useStrategy } from '@/hooks/useStrategy';
import type { Strategy } from '@/lib/types/strategy';
import type { ApiStrategy } from '@/lib/types/api-strategy';

interface StrategySavingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: Strategy | null;
  chainId: number;
  onSuccess: (savedStrategy: ApiStrategy) => void;
  onCancel: () => void;
}

type SaveStatus = 'idle' | 'validating' | 'saving' | 'success' | 'error';

/**
 * StrategySavingModal Component
 *
 * Shows progress when saving a strategy before wizard opens:
 * - Validation step
 * - Backend save step
 * - Success/error feedback
 * - Retry on error
 */
export function StrategySavingModal({
  open,
  onOpenChange,
  strategy,
  chainId,
  onSuccess,
  onCancel,
}: StrategySavingModalProps) {
  const { saveStrategy, saving } = useStrategy(chainId);

  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [savedStrategy, setSavedStrategy] = useState<ApiStrategy | null>(null);

  /**
   * Reset state when modal closes
   */
  useEffect(() => {
    if (!open) {
      // Reset all state when modal closes
      setStatus('idle');
      setError(null);
      setSavedStrategy(null);
    }
  }, [open]);

  /**
   * Auto-save when modal opens
   */
  useEffect(() => {
    if (open && strategy && status === 'idle') {
      handleSave();
    }
  }, [open, strategy, status]);

  /**
   * Handle strategy save
   */
  const handleSave = async () => {
    if (!strategy) {
      setError('No strategy provided');
      setStatus('error');
      return;
    }

    try {
      setStatus('validating');
      setError(null);

      // Simulate validation delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      setStatus('saving');

      const result = await saveStrategy(strategy, chainId);

      if (result) {
        setSavedStrategy(result);
        setStatus('success');

        // Auto-proceed after brief success display
        setTimeout(() => {
          onSuccess(result);
        }, 1500);
      } else {
        throw new Error('Failed to save strategy - no result returned');
      }
    } catch (err: any) {
      console.error('Strategy save error:', err);
      setError(err.message || 'Failed to save strategy');
      setStatus('error');
    }
  };

  /**
   * Handle retry
   */
  const handleRetry = () => {
    setStatus('idle');
    setError(null);
    setSavedStrategy(null);
    handleSave();
  };

  /**
   * Handle cancel/go back
   */
  const handleCancel = () => {
    setStatus('idle');
    setError(null);
    setSavedStrategy(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preparing Strategy</DialogTitle>
          <DialogDescription>
            {status === 'error'
              ? 'Please fix the issues and try again'
              : 'Saving your strategy to the backend'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Validation Step */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-1 ${
                status === 'validating'
                  ? 'text-blue-600'
                  : status === 'saving' || status === 'success'
                  ? 'text-green-600'
                  : status === 'error'
                  ? 'text-red-600'
                  : 'text-gray-400'
              }`}
            >
              {status === 'validating' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : status === 'saving' || status === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : status === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <FileCheck className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Validating Strategy</div>
              <div className="text-sm text-gray-600 mt-0.5">
                {status === 'validating'
                  ? 'Checking tokens, weights, and configuration...'
                  : status === 'saving' || status === 'success'
                  ? 'Validation passed'
                  : status === 'error'
                  ? 'Validation failed'
                  : 'Waiting...'}
              </div>
            </div>
          </div>

          {/* Save Step */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-1 ${
                status === 'saving'
                  ? 'text-blue-600'
                  : status === 'success'
                  ? 'text-green-600'
                  : status === 'error'
                  ? 'text-red-600'
                  : 'text-gray-400'
              }`}
            >
              {status === 'saving' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : status === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : status === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Saving to Backend</div>
              <div className="text-sm text-gray-600 mt-0.5">
                {status === 'saving'
                  ? 'Submitting strategy to backend...'
                  : status === 'success'
                  ? 'Strategy saved successfully'
                  : status === 'error'
                  ? 'Save failed'
                  : 'Waiting...'}
              </div>
            </div>
          </div>

          {/* Success Message */}
          {status === 'success' && savedStrategy && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">
                <strong>Strategy Saved!</strong>
                <br />
                ID: {savedStrategy.id}
                <br />
                Proceeding to wizard...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">
                <strong>Save Failed</strong>
                <br />
                {error}
                <br />
                <br />
                <span className="text-xs">
                  Please check your strategy configuration and try again. Common issues:
                  <br />
                  • Weights don't sum to 100%
                  <br />
                  • Multiple chains in same strategy
                  <br />
                  • Missing asset blocks
                  <br />• Authentication expired
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Strategy Info (while saving) */}
          {(status === 'validating' || status === 'saving') && strategy && (
            <div className="border rounded-lg p-3 bg-gray-50 text-sm">
              <div className="font-medium text-gray-900 mb-2">Strategy Details</div>
              <div className="space-y-1 text-gray-600">
                <div>
                  <span className="font-medium">Name:</span> {strategy.name || 'Untitled'}
                </div>
                <div>
                  <span className="font-medium">Assets:</span>{' '}
                  {strategy.blocks.filter(b => b.type === 'asset').length}
                </div>
                <div>
                  <span className="font-medium">Chain:</span> {chainId === 10143 ? 'Monad' : 'Base'}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={status === 'validating' || status === 'saving'}
            >
              {status === 'error' ? 'Go Back & Fix' : 'Cancel'}
            </Button>

            {status === 'error' && (
              <Button onClick={handleRetry} className="bg-gray-900 hover:bg-gray-800">
                Retry Save
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

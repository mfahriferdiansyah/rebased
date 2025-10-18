import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { SmartAccountStep } from './steps/SmartAccountStep';
import { DeployStrategyStep } from './steps/DeployStrategyStep';
import { FundTransferStep } from './steps/FundTransferStep';
import { DelegationStep } from './steps/DelegationStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { DelegationManagementStep } from './steps/DelegationManagementStep';
import { strategiesApi } from '@/lib/api/strategies';
import { useAuth } from '@/hooks/useAuth';
import type { Address } from 'viem';
import type { Strategy } from '@/lib/types/strategy';

interface StrategySetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy?: Strategy; // Canvas strategy (optional for management-only mode)
  chainId: number;
  initialStep?: WizardStep; // Starting step (default: 'smart-account')
  initialDelegatorAddress?: Address; // For management mode when delegation exists
  onComplete?: () => void;
}

type WizardStep = 'smart-account' | 'deploy-strategy' | 'fund-transfer' | 'delegation' | 'confirmation' | 'manage';

interface WizardState {
  currentStep: WizardStep;
  delegatorAddress: Address | null;
  savedStrategyId: string | null; // Backend strategy ID after saving
  completedSteps: Set<WizardStep>;
}

const STEPS: { key: WizardStep; title: string; description: string }[] = [
  {
    key: 'smart-account',
    title: 'Smart Account',
    description: 'Create or verify your DeleGator smart account',
  },
  {
    key: 'deploy-strategy',
    title: 'Deploy Strategy',
    description: 'Register your strategy on the blockchain',
  },
  {
    key: 'fund-transfer',
    title: 'Fund Transfer',
    description: 'Transfer assets to your smart account',
  },
  {
    key: 'delegation',
    title: 'Delegation',
    description: 'Authorize the bot to execute strategies',
  },
  {
    key: 'confirmation',
    title: 'Confirmation',
    description: 'Review and complete setup',
  },
  {
    key: 'manage',
    title: 'Manage',
    description: 'Manage your delegation and settings',
  },
];

/**
 * StrategySetupWizard Component
 *
 * Multi-step wizard for setting up automated strategy execution:
 * NOTE: Strategy is saved in StrategySavingModal before this wizard opens
 * 1. Smart Account - Create/verify DeleGator
 * 2. Deploy Strategy - Register strategy on-chain in StrategyRegistry
 * 3. Fund Transfer - Move assets to smart account
 * 4. Delegation - Sign ERC-7710 delegation
 * 5. Confirmation - Show summary and next steps
 */
export function StrategySetupWizard({
  open,
  onOpenChange,
  strategy,
  chainId,
  initialStep = 'smart-account',
  initialDelegatorAddress,
  onComplete,
}: StrategySetupWizardProps) {
  const { getBackendToken } = useAuth();
  const [state, setState] = useState<WizardState>({
    currentStep: initialStep,
    delegatorAddress: initialDelegatorAddress || null,
    savedStrategyId: null, // Will be set after on-chain deployment
    completedSteps: new Set(),
  });

  // Update currentStep and delegatorAddress when initialStep changes (e.g., when modal reopens)
  useEffect(() => {
    if (open) {
      setState(prev => ({
        ...prev,
        currentStep: initialStep,
        delegatorAddress: initialDelegatorAddress || prev.delegatorAddress,
      }));
    }
  }, [open, initialStep, initialDelegatorAddress]);

  /**
   * Get current step index
   */
  const currentStepIndex = STEPS.findIndex(s => s.key === state.currentStep);

  /**
   * Calculate progress percentage
   */
  const progressPercentage = ((currentStepIndex + 1) / STEPS.length) * 100;

  /**
   * Handle moving to next step
   */
  const handleNextStep = async (step: WizardStep, data?: any) => {
    const completedSteps = new Set(state.completedSteps);
    completedSteps.add(state.currentStep);

    let nextStep: WizardStep;
    switch (step) {
      case 'smart-account':
        nextStep = 'deploy-strategy';
        const delegatorAddress = data as Address;

        // Update strategy's delegatorAddress (DeleGator smart contract)
        // userAddress remains as the EOA owner for authentication
        console.log('🔍 SmartAccountStep complete:', {
          savedStrategyId: state.savedStrategyId,
          delegatorAddress
        });

        if (state.savedStrategyId && delegatorAddress) {
          try {
            const token = await getBackendToken();
            if (token) {
              console.log(`📡 Calling updateStrategy API for ${state.savedStrategyId}...`);
              await strategiesApi.updateStrategy(
                state.savedStrategyId,
                { delegatorAddress: delegatorAddress.toLowerCase() },
                token
              );
              console.log(`✅ Updated strategy ${state.savedStrategyId} with DeleGator ${delegatorAddress}`);
            } else {
              console.error('❌ No backend token available');
            }
          } catch (error) {
            console.error('❌ Failed to update strategy with DeleGator address:', error);
            // Continue anyway - non-fatal
          }
        } else {
          console.warn('⚠️ Skipping strategy update:', {
            hasSavedStrategyId: !!state.savedStrategyId,
            hasDelegatorAddress: !!delegatorAddress
          });
        }

        setState(prev => ({
          ...prev,
          currentStep: nextStep,
          delegatorAddress,
          completedSteps,
        }));
        break;
      case 'deploy-strategy':
        nextStep = 'fund-transfer';
        const savedStrategyId = data as string;

        console.log('✅ DeployStrategyStep complete:', { savedStrategyId });

        setState(prev => ({
          ...prev,
          currentStep: nextStep,
          savedStrategyId, // Save DB strategy ID for delegation step
          completedSteps,
        }));
        break;
      case 'fund-transfer':
        nextStep = 'delegation';
        setState(prev => ({
          ...prev,
          currentStep: nextStep,
          completedSteps,
        }));
        break;
      case 'delegation':
        nextStep = 'confirmation';
        setState(prev => ({
          ...prev,
          currentStep: nextStep,
          completedSteps,
        }));
        break;
      case 'confirmation':
        // Move to delegation management step
        nextStep = 'manage';
        setState(prev => ({
          ...prev,
          currentStep: nextStep,
          completedSteps,
        }));
        break;
      case 'manage':
        // Management step complete - close wizard
        handleComplete();
        break;
    }
  };

  /**
   * Handle going back to previous step
   */
  const handleBackStep = (step: WizardStep) => {
    let previousStep: WizardStep;
    switch (step) {
      case 'deploy-strategy':
        previousStep = 'smart-account';
        break;
      case 'fund-transfer':
        previousStep = 'deploy-strategy';
        break;
      case 'delegation':
        previousStep = 'fund-transfer';
        break;
      case 'confirmation':
        previousStep = 'delegation';
        break;
      default:
        return;
    }

    setState(prev => ({
      ...prev,
      currentStep: previousStep,
    }));
  };

  /**
   * Handle delegation revocation - reset to step 1
   */
  const handleRevoke = () => {
    // Reset wizard state to step 1
    setState({
      currentStep: 'smart-account',
      delegatorAddress: null,
      savedStrategyId: null,
      completedSteps: new Set(),
    });
  };

  /**
   * Handle wizard cancellation
   */
  const handleCancel = () => {
    // Reset wizard state
    setState({
      currentStep: 'smart-account',
      delegatorAddress: null,
      savedStrategyId: null,
      completedSteps: new Set(),
    });
    onOpenChange(false);
  };

  /**
   * Handle wizard completion
   */
  const handleComplete = () => {
    // Reset wizard state
    setState({
      currentStep: 'smart-account',
      delegatorAddress: null,
      savedStrategyId: null,
      completedSteps: new Set(),
    });

    // Close wizard
    onOpenChange(false);

    // Trigger completion callback
    if (onComplete) {
      onComplete();
    }
  };

  /**
   * Render current step component
   */
  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 'smart-account':
        return (
          <SmartAccountStep
            onNext={(delegatorAddress) => handleNextStep('smart-account', delegatorAddress)}
            onCancel={handleCancel}
          />
        );

      case 'deploy-strategy':
        if (!state.delegatorAddress) {
          return <div className="text-red-600">Error: No delegator address</div>;
        }
        return (
          <DeployStrategyStep
            strategy={strategy}
            delegatorAddress={state.delegatorAddress}
            chainId={chainId}
            onNext={(savedStrategyId) => handleNextStep('deploy-strategy', savedStrategyId)}
            onBack={() => handleBackStep('deploy-strategy')}
            onCancel={handleCancel}
          />
        );

      case 'fund-transfer':
        if (!state.delegatorAddress) {
          return <div className="text-red-600">Error: No delegator address</div>;
        }
        return (
          <FundTransferStep
            delegatorAddress={state.delegatorAddress}
            strategy={strategy}
            onNext={() => handleNextStep('fund-transfer')}
            onBack={() => handleBackStep('fund-transfer')}
            onCancel={handleCancel}
          />
        );

      case 'delegation':
        if (!state.delegatorAddress) {
          return <div className="text-red-600">Error: No delegator address</div>;
        }
        return (
          <DelegationStep
            delegatorAddress={state.delegatorAddress}
            strategyId={state.savedStrategyId || undefined}
            chainId={chainId}
            onNext={() => handleNextStep('delegation')}
            onBack={() => handleBackStep('delegation')}
            onCancel={handleCancel}
          />
        );

      case 'confirmation':
        if (!state.delegatorAddress) {
          return <div className="text-red-600">Error: No delegator address</div>;
        }
        return (
          <ConfirmationStep
            delegatorAddress={state.delegatorAddress}
            onFinish={() => handleNextStep('confirmation')}
          />
        );

      case 'manage':
        if (!state.delegatorAddress) {
          return <div className="text-red-600">Error: No delegator address</div>;
        }
        return (
          <DelegationManagementStep
            delegatorAddress={state.delegatorAddress}
            chainId={chainId}
            onRevoke={handleRevoke}
            onFinish={() => handleNextStep('manage')}
          />
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Strategy Setup</DialogTitle>
          <DialogDescription>
            {STEPS[currentStepIndex]?.description || 'Complete the setup process'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="font-medium text-gray-900">
              {STEPS[currentStepIndex]?.title}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div
              key={step.key}
              className="flex flex-col items-center gap-1 flex-1"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index < currentStepIndex
                    ? 'bg-green-100 text-green-700'
                    : index === currentStepIndex
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span className="text-xs text-gray-600 text-center hidden sm:block">
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="py-4">{renderCurrentStep()}</div>
      </DialogContent>
    </Dialog>
  );
}

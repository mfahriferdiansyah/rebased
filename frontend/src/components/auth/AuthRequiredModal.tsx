import { Shield, LogIn, Loader2, CheckCircle2, Wallet, AlertCircle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect } from 'react';

/**
 * AuthRequiredModal
 *
 * Full-screen blocking modal that prevents canvas interaction until authentication succeeds.
 *
 * Features:
 * - Two-step authentication visual feedback (Privy → Backend SIWE)
 * - Animated completion celebration with manual dismiss
 * - Cannot be dismissed until authentication completes
 * - Blurred backdrop with centered auth card
 * - Visual feedback on button interactions
 * - Edge case handling (cancellation, errors, etc.)
 * - Smooth fast animations with unicorn-grade polish
 */

interface AuthRequiredModalProps {
  onComplete?: () => void;
}

export function AuthRequiredModal({ onComplete }: AuthRequiredModalProps) {
  const { ready, login, authenticated: isPrivyAuthenticated } = usePrivy();
  const { isAuthenticating, isBackendAuthenticated, getBackendToken, resetAutoRetryFlags } = useAuth();
  const [showCompletion, setShowCompletion] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualSigning, setIsManualSigning] = useState(false);

  // Determine current step
  const step1Complete = isPrivyAuthenticated;
  const step2Complete = isBackendAuthenticated;
  const currentStep = !step1Complete ? 1 : !step2Complete ? 2 : showCompletion ? 3 : 2;
  const progress = !step1Complete ? 0 : !step2Complete ? 50 : 100;

  // Show completion animation when both steps complete
  useEffect(() => {
    if (step1Complete && step2Complete) {
      setShowCompletion(true);
      setErrorMessage(null); // Clear any errors on success
    }
  }, [step1Complete, step2Complete]);

  // Clear connecting state if Privy auth succeeds
  useEffect(() => {
    if (isPrivyAuthenticated && isConnecting) {
      setIsConnecting(false);
    }
  }, [isPrivyAuthenticated, isConnecting]);

  // Handle connect wallet click with visual feedback and error handling
  const handleConnectWallet = async () => {
    if (!ready || isConnecting) return;

    setIsConnecting(true);
    setErrorMessage(null); // Clear previous errors

    try {
      await login();
      // If we reach here, login was successful or user is authenticating
    } catch (error: any) {
      console.error('Login error:', error);

      // Handle different error cases
      if (error?.message?.includes('User closed')) {
        setErrorMessage('Wallet connection cancelled. Please try again.');
      } else if (error?.message?.includes('rejected')) {
        setErrorMessage('Connection rejected. Please approve to continue.');
      } else if (error?.message?.includes('network')) {
        setErrorMessage('Network error. Please check your connection.');
      } else {
        setErrorMessage('Failed to connect wallet. Please try again.');
      }

      setIsConnecting(false);
    }
  };

  // Handle completion dismiss
  const handleDismiss = () => {
    onComplete?.();
  };

  // Clear error on retry
  const handleRetry = () => {
    setErrorMessage(null);
    handleConnectWallet();
  };

  // Handle manual sign trigger
  const handleManualSign = async () => {
    setIsManualSigning(true);
    setErrorMessage(null);
    try {
      // Reset auto-retry flags to allow signing again
      resetAutoRetryFlags();
      // Trigger SIWE flow
      await getBackendToken();
    } catch (error: any) {
      console.error('Manual sign error:', error);
      setErrorMessage(error?.message || 'Failed to sign message');
    } finally {
      setIsManualSigning(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        <Card className="w-full max-w-md mx-4 shadow-2xl border-2">
          <CardHeader className="text-center space-y-4 pb-4">
            {/* Header Icon - Shield or Animated Checkmark */}
            <AnimatePresence mode="wait">
              {showCompletion ? (
                <motion.div
                  key="completion-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{
                    delay: 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  className="w-16 h-16 mx-auto relative"
                >
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center"
                    initial={{ rotate: -180 }}
                    animate={{ rotate: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      <CheckCircle2 className="w-9 h-9 text-white" strokeWidth={2.5} />
                    </motion.div>
                  </motion.div>

                  {/* Animated ring - loops infinitely */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-gray-300"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      ease: "easeOut",
                      repeat: Infinity,
                      repeatDelay: 0.3
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="shield-icon"
                  initial={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-16 h-16 mx-auto bg-gray-900 rounded-full flex items-center justify-center"
                >
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>
              )}
            </AnimatePresence>

            <CardTitle className="text-2xl">
              {showCompletion ? "Authentication Complete!" : "Authentication Required"}
            </CardTitle>
            <CardDescription className="text-base">
              {showCompletion
                ? "You're all set! Click below to continue to your canvas."
                : "Sign in with your wallet to access the canvas and build strategies"
              }
            </CardDescription>

            {/* Progress indicator - hide when complete */}
            {!showCompletion && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Step {currentStep} of 2</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4 pb-8">
            {/* Status display with AnimatePresence for smooth transitions */}
            <AnimatePresence mode="wait">
              {!isPrivyAuthenticated ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="w-full"
                >
                  <Button
                    onClick={handleConnectWallet}
                    disabled={!ready || isConnecting}
                    size="lg"
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-6 text-base transition-all duration-200 active:scale-[0.98]"
                  >
                    {!ready || isConnecting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {!ready ? "Loading..." : "Connecting..."}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Connect Wallet
                      </>
                    )}
                  </Button>

                  {/* Error message */}
                  <AnimatePresence mode="wait">
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -5, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3"
                      >
                        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-orange-900">{errorMessage}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    Step 1: Connect your wallet
                  </p>
                </motion.div>
              ) : !isBackendAuthenticated ? (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="w-full space-y-3"
                >
                  <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-gray-700 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Wallet Connected</p>
                      <p className="text-xs text-gray-600">Ready to sign</p>
                    </div>
                  </div>

                  {isAuthenticating || isManualSigning ? (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <Loader2 className="w-5 h-5 text-gray-700 animate-spin flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Signing Message</p>
                        <p className="text-xs text-gray-600">Please sign the message in your wallet</p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={handleManualSign}
                      disabled={isAuthenticating || isManualSigning}
                      size="lg"
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-6 text-base transition-all duration-200 active:scale-[0.98]"
                    >
                      <Shield className="w-5 h-5 mr-2" />
                      Sign Message
                    </Button>
                  )}

                  {errorMessage && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    Step 2: Sign message to verify ownership
                  </p>
                </motion.div>
              ) : showCompletion ? (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="w-full"
                >
                  <Button
                    onClick={handleDismiss}
                    size="lg"
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-6 text-base transition-all duration-200 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Continue to Canvas
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <p className="text-xs text-gray-500 text-center max-w-xs pt-2">
              Secure authentication with MetaMask, WalletConnect, email, and social logins.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

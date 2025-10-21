import { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { SiweMessage } from 'siwe';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';
import { monadTestnet } from '@/lib/chains';
import { toast as sonnerToast } from 'sonner';

/**
 * Auth Context - Single Source of Truth for Authentication
 *
 * Combines Privy authentication with SIWE (Sign-In With Ethereum) flow
 * to obtain backend-issued JWT tokens for API access.
 *
 * This is a React Context to ensure ONLY ONE instance of auth logic runs,
 * preventing multiple nonce requests and sign prompts.
 */

interface AuthContextType {
  // Privy state
  isPrivyAuthenticated: boolean;
  userAddress: `0x${string}` | undefined;
  wallet: any;

  // Backend JWT state
  backendToken: string | null;
  isBackendAuthenticated: boolean;
  isAuthenticating: boolean;

  // Actions
  getBackendToken: () => Promise<string | null>;
  triggerSIWE: () => Promise<void>;
  clearBackendAuth: () => void;
  resetAutoRetryFlags: () => void;

  // Combined state
  isFullyAuthenticated: boolean;

  // Rate limit info
  canRetry: boolean;
  attemptsRemaining: number;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { authenticated, ready, logout } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();

  // Backend JWT state (initialized from localStorage)
  const [backendToken, setBackendToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rebased_backend_token');
    } catch {
      return null;
    }
  });
  const [tokenExpiry, setTokenExpiry] = useState<number>(() => {
    try {
      const expiry = localStorage.getItem('rebased_token_expiry');
      return expiry ? parseInt(expiry, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // SHARED REFS - Only one instance for entire app
  const siweCompletedRef = useRef(false);
  const siweInProgressRef = useRef(false);
  const autoRetryAttemptedRef = useRef(false);

  // Manual retry rate limiting
  const attemptCount = useRef(0);
  const lastAttemptTime = useRef(0);
  const MAX_ATTEMPTS = 3;
  const COOLDOWN_MS = 3000;

  // Network switching state
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const networkSwitchAttemptedRef = useRef(false);

  const wallet = wallets[0];
  const userAddress = wallet?.address as `0x${string}` | undefined;

  /**
   * Check if backend JWT is valid
   */
  const isBackendAuthenticated = useCallback(() => {
    if (!backendToken || !tokenExpiry) return false;
    // Check if token expires in more than 5 minutes
    return Date.now() < tokenExpiry - 300000;
  }, [backendToken, tokenExpiry]);

  /**
   * Switch wallet to Monad testnet
   * Uses Privy's native wallet.switchChain() method
   */
  const switchToMonadTestnet = useCallback(async (): Promise<boolean> => {
    if (!wallet) {
      console.warn('⚠️ No wallet available for network switch');
      return false;
    }

    try {
      console.log('🔄 Switching to Monad Testnet...');
      setIsSwitchingNetwork(true);

      // Use Privy's wallet.switchChain method
      await wallet.switchChain(monadTestnet.id);

      console.log('✅ Successfully switched to Monad Testnet');
      sonnerToast.success('Network switched', {
        description: `Connected to ${monadTestnet.name}`,
      });

      return true;
    } catch (error: any) {
      console.error('❌ Failed to switch network:', error);

      // Only show error if user didn't cancel
      if (!error.message?.includes('User rejected') && !error.message?.includes('cancelled')) {
        sonnerToast.error('Network switch required', {
          description: `Please switch to ${monadTestnet.name} manually in your wallet`,
        });
      }

      return false;
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, [wallet]);

  /**
   * Get valid backend JWT token
   * Returns cached token if valid, otherwise triggers SIWE flow
   */
  const getBackendToken = useCallback(async (): Promise<string | null> => {
    // Return cached token if still valid
    if (isBackendAuthenticated()) {
      console.log('✅ Returning cached backend token');
      return backendToken;
    }

    // If not authenticated with Privy, cannot proceed
    if (!authenticated || !ready || !userAddress || !wallet) {
      console.log('❌ Not authenticated with Privy');
      return null;
    }

    // Prevent concurrent SIWE flows (fixes "invalid nonce" issue)
    if (siweInProgressRef.current) {
      console.log('⏳ SIWE flow already in progress, skipping...');
      return null;
    }

    // Trigger SIWE flow
    try {
      siweInProgressRef.current = true;
      setIsAuthenticating(true);

      console.log('🔐 Starting SIWE flow for:', userAddress);

      // Step 1: Get nonce from backend
      console.log('1️⃣ Getting nonce from backend...');
      const { nonce } = await authApi.getNonce(userAddress.toLowerCase());
      console.log('   Nonce received:', nonce);

      // Step 2: Create SIWE message
      console.log('2️⃣ Creating SIWE message...');
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address: userAddress,
        statement: 'Sign in to Rebased',
        uri: window.location.origin,
        version: '1',
        chainId: wallet.chainId === 'eip155:10143' ? 10143 : 84532,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const messageToSign = siweMessage.prepareMessage();
      console.log('   Message prepared');

      // Step 3: Sign message with Privy wallet
      console.log('3️⃣ Requesting signature from wallet...');
      const provider = await wallet.getEthereumProvider();
      const signature = await provider.request({
        method: 'personal_sign',
        params: [messageToSign, userAddress],
      }) as string;
      console.log('   Signature received:', signature.substring(0, 20) + '...');

      // Step 4: Verify signature with backend and get JWT
      console.log('4️⃣ Verifying signature with backend...');
      const authResponse = await authApi.verifySignature(messageToSign, signature);
      console.log('   Backend JWT received, expires:', new Date(authResponse.expiresAt).toISOString());

      // Step 5: Cache token (both in state and localStorage)
      setBackendToken(authResponse.accessToken);
      setTokenExpiry(authResponse.expiresAt);
      siweCompletedRef.current = true;

      // Persist to localStorage for page refresh
      try {
        localStorage.setItem('rebased_backend_token', authResponse.accessToken);
        localStorage.setItem('rebased_token_expiry', authResponse.expiresAt.toString());
      } catch (error) {
        console.warn('Failed to persist token to localStorage:', error);
      }

      // Reset attempt counter on success
      attemptCount.current = 0;
      lastAttemptTime.current = 0;

      toast({
        title: 'Authentication successful',
        description: 'You are now signed in to the backend',
      });

      console.log('✅ SIWE flow completed successfully');

      return authResponse.accessToken;
    } catch (error: any) {
      console.error('❌ SIWE authentication failed:', error);

      // Set completion flag to prevent retry loops
      siweCompletedRef.current = true;

      // Better error messages
      let errorMessage = error.message || 'Failed to authenticate with backend';

      if (error.message?.includes('Invalid nonce')) {
        errorMessage = 'Session expired. Use the "Disconnect & Retry" button below.';
      } else if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        errorMessage = 'Signature cancelled. Use the "Try Signing Again" button below.';
      } else {
        errorMessage = `${errorMessage}. Use the retry button below.`;
      }

      toast({
        title: 'Authentication failed',
        description: errorMessage,
        variant: 'destructive',
      });

      // DON'T auto-disconnect - let user decide via AuthRetryButton
      return null;
    } finally {
      setIsAuthenticating(false);
      siweInProgressRef.current = false;
    }
  }, [
    isBackendAuthenticated,
    backendToken,
    authenticated,
    ready,
    userAddress,
    wallet,
    toast,
  ]);

  /**
   * Manual SIWE trigger with rate limiting
   */
  const triggerSIWE = useCallback(async () => {
    const now = Date.now();

    if (isBackendAuthenticated()) {
      toast({
        title: 'Already authenticated',
        description: 'You are already signed in to the backend',
      });
      return;
    }

    if (!authenticated || !ready || !userAddress || !wallet) {
      toast({
        title: 'Not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    if (now - lastAttemptTime.current < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastAttemptTime.current)) / 1000);
      toast({
        title: 'Please wait',
        description: `Try again in ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`,
      });
      return;
    }

    if (attemptCount.current >= MAX_ATTEMPTS) {
      toast({
        title: 'Too many attempts',
        description: 'Please refresh the page and try again',
        variant: 'destructive',
      });
      return;
    }

    siweCompletedRef.current = false;
    lastAttemptTime.current = now;
    attemptCount.current++;

    console.log(`🔐 Manual SIWE trigger (attempt ${attemptCount.current}/${MAX_ATTEMPTS})`);

    await getBackendToken();
  }, [isBackendAuthenticated, authenticated, ready, userAddress, wallet, getBackendToken, toast]);

  /**
   * Clear backend authentication
   */
  const clearBackendAuth = useCallback(() => {
    setBackendToken(null);
    setTokenExpiry(0);
    siweCompletedRef.current = false;
    autoRetryAttemptedRef.current = false;
    networkSwitchAttemptedRef.current = false; // Reset network switch flag
    attemptCount.current = 0;
    lastAttemptTime.current = 0;

    try {
      localStorage.removeItem('rebased_backend_token');
      localStorage.removeItem('rebased_token_expiry');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }, []);

  /**
   * Reset auto-retry flags to allow manual retry
   */
  const resetAutoRetryFlags = useCallback(() => {
    siweCompletedRef.current = false;
    autoRetryAttemptedRef.current = false;
    siweInProgressRef.current = false;
    networkSwitchAttemptedRef.current = false; // Allow network switch retry
    console.log('🔄 Auto-retry flags reset for manual retry');
  }, []);

  /**
   * Effect: Auto-switch to Monad testnet after Privy authentication
   * This ensures wallet is on correct network BEFORE SIWE flow
   */
  useEffect(() => {
    const checkAndSwitchNetwork = async () => {
      // Only proceed if authenticated via Privy and have wallet
      if (!authenticated || !ready || !wallet || networkSwitchAttemptedRef.current) {
        return;
      }

      // Check wallet's current chain
      const walletChainId = wallet.chainId;
      console.log('🔍 Checking wallet network:', { walletChainId, required: monadTestnet.id });

      // Extract numeric chain ID from Privy's format (e.g., "eip155:10143" -> 10143)
      const numericChainId = walletChainId?.includes(':')
        ? parseInt(walletChainId.split(':')[1])
        : parseInt(walletChainId);

      // If already on Monad testnet, skip
      if (numericChainId === monadTestnet.id) {
        console.log('✅ Already on Monad Testnet');
        networkSwitchAttemptedRef.current = true;
        return;
      }

      // Mark as attempted to prevent loops
      networkSwitchAttemptedRef.current = true;

      // Attempt to switch network
      console.log('⚠️ Wrong network detected. Auto-switching to Monad Testnet...');
      const success = await switchToMonadTestnet();

      if (!success) {
        console.warn('⚠️ Network switch failed or cancelled. User must switch manually.');
      }
    };

    checkAndSwitchNetwork();
  }, [authenticated, ready, wallet, switchToMonadTestnet]);

  /**
   * Effect: Auto-trigger SIWE flow after Privy authentication
   * IMPORTANT: Runs only ONCE for entire app (not per component)
   * IMPORTANT: Only runs AFTER network switch is complete
   */
  useEffect(() => {
    const hasValidCachedToken = isBackendAuthenticated();

    const shouldAutoTrigger =
      authenticated &&
      ready &&
      userAddress &&
      wallet &&
      !hasValidCachedToken &&
      !siweInProgressRef.current &&
      !autoRetryAttemptedRef.current &&
      !siweCompletedRef.current &&
      !isSwitchingNetwork; // Wait for network switch to complete

    if (shouldAutoTrigger) {
      console.log('🔐 [AuthContext] No valid cached token found. Auto-triggering SIWE flow...');
      autoRetryAttemptedRef.current = true;

      const timer = setTimeout(() => {
        getBackendToken();
      }, 500);

      return () => clearTimeout(timer);
    } else if (hasValidCachedToken) {
      console.log('✅ [AuthContext] Valid cached backend token found. Skipping auto-trigger.');
      siweCompletedRef.current = true;
      autoRetryAttemptedRef.current = true;
    }
    // NOTE: Removed getBackendToken from dependencies to prevent re-runs
  }, [authenticated, ready, userAddress, wallet, isBackendAuthenticated, isSwitchingNetwork]);

  /**
   * Effect: Clear backend auth when Privy session ends
   */
  useEffect(() => {
    if (!authenticated) {
      clearBackendAuth();
    }
  }, [authenticated, clearBackendAuth]);

  const value: AuthContextType = {
    // Privy state
    isPrivyAuthenticated: authenticated && ready,
    userAddress,
    wallet,

    // Backend JWT state
    backendToken,
    isBackendAuthenticated: isBackendAuthenticated(),
    isAuthenticating,

    // Actions
    getBackendToken,
    triggerSIWE,
    clearBackendAuth,
    resetAutoRetryFlags,

    // Combined state
    isFullyAuthenticated: authenticated && ready && isBackendAuthenticated(),

    // Rate limit info
    canRetry: attemptCount.current < MAX_ATTEMPTS,
    attemptsRemaining: MAX_ATTEMPTS - attemptCount.current,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

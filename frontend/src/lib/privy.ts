import { PrivyClientConfig } from '@privy-io/react-auth';
import { monadTestnet, baseSepoliaTestnet } from './chains';

/**
 * Privy Configuration
 *
 * Features enabled:
 * - Email login with OTP
 * - Social logins (Google, Twitter)
 * - External wallet connection (MetaMask, WalletConnect)
 * - Embedded wallets (auto-created for email users)
 * - Fiat onramp (Moonpay integration)
 */
export const privyConfig: PrivyClientConfig = {
  // Privy App ID from dashboard.privy.io
  appId: import.meta.env.VITE_PRIVY_APP_ID || '',

  // Available login methods
  loginMethods: [
    'email',      // Email + OTP
    'wallet',     // MetaMask, WalletConnect, etc
    'google',     // Google OAuth
    'twitter',    // Twitter OAuth
  ],

  // UI Appearance
  appearance: {
    theme: 'light',
    accentColor: '#000000',
    logo: '/logo.svg',
    landingHeader: 'Welcome to Rebased',
    loginMessage: 'Sign in to start automating your portfolio',
  },

  // Embedded Wallet Configuration
  embeddedWallets: {
    // Auto-create embedded wallet for email/social users
    createOnLogin: 'users-without-wallets',
    // Don't require password (simpler UX)
    requireUserPasswordOnCreate: false,
    // Show "Export Wallet" option in UI
    showWalletUIs: true,
  },

  // Supported blockchain networks - ONLY Monad for hackathon (Base coming soon)
  supportedChains: [monadTestnet],

  // Default chain when wallet is first created
  defaultChain: monadTestnet,

  // Fiat On-Ramp (Moonpay)
  fiatOnRamp: {
    enabled: true,
    // Use Moonpay sandbox for testnet
    useSandbox: true,
  },

  // Additional features
  externalWallets: {
    // Support MetaMask, WalletConnect, Coinbase Wallet
    coinbaseWallet: {
      connectionOptions: 'all'
    },
  },

  // Legal links
  legal: {
    termsAndConditionsUrl: 'https://rebased.xyz/terms',
    privacyPolicyUrl: 'https://rebased.xyz/privacy',
  },
};

/**
 * Get Privy App ID
 * Throws error if not configured
 */
export function getPrivyAppId(): string {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId || appId === 'your-privy-app-id-here') {
    throw new Error(
      'Privy App ID not configured. ' +
      'Get your App ID from https://dashboard.privy.io and add it to .env'
    );
  }

  return appId;
}

/**
 * Check if Privy is properly configured
 */
export function isPrivyConfigured(): boolean {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;
  return Boolean(appId && appId !== 'your-privy-app-id-here');
}

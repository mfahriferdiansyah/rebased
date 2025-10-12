# Privy Wallet Integration Setup

This guide explains how to configure Privy for wallet authentication and onramp support in the Rebased frontend.

## Why Privy?

Privy provides:

- **Email & Social Login** - Lower barrier to entry for non-crypto users
- **Embedded Wallets** - Automatic wallet creation for email/social users
- **Moonpay Onramp** - Buy crypto with credit card (fiat on/off-ramp)
- **External Wallet Support** - MetaMask, WalletConnect, etc.
- **Better UX** - Single SDK for all authentication methods

## Setup Instructions

### 1. Create Privy Account

1. Go to [dashboard.privy.io](https://dashboard.privy.io)
2. Sign up or log in
3. Create a new app
4. Copy your **App ID** (format: `clpxxxxxxxxxxxx`)

### 2. Configure Environment Variables

Create a `.env` file in `rebased/frontend/`:

```bash
# Privy Configuration
VITE_PRIVY_APP_ID=your-privy-app-id-here

# Backend API
VITE_BACKEND_URL=http://localhost:3000

# OpenAI (for AI strategy generation)
VITE_OPENAI_API_KEY=your-openai-key-here
```

**IMPORTANT**: Replace `your-privy-app-id-here` with your actual Privy App ID from step 1.

### 3. Configure Privy Dashboard Settings

In your Privy dashboard:

#### **Login Methods**

Enable the following:

- ✅ Email (OTP)
- ✅ Google OAuth
- ✅ Twitter OAuth
- ✅ Wallet (MetaMask, WalletConnect)

#### **Embedded Wallets**

- Enable "Create on login for users without wallets"
- Disable "Require password on create" (for better UX)

#### **Chains**

Add the following networks:

**Monad Testnet**

- Chain ID: `10143`
- RPC URL: `https://testnet-rpc.monad.xyz`
- Currency: MON
- Block Explorer: `https://explorer.testnet.monad.xyz`

**Base Sepolia**

- Chain ID: `84532`
- RPC URL: `https://sepolia.base.org`
- Currency: ETH
- Block Explorer: `https://sepolia.basescan.org`

#### **Fiat On-Ramp**

- Enable Moonpay
- Use **Sandbox Mode** for testing
- Configure allowed fiat currencies (USD, EUR, etc.)

#### **Appearance**

- Set app name: `Rebased`
- Upload logo (optional)
- Set accent color: `#000000` (black)
- Choose theme: `light`

### 4. Install Dependencies

Dependencies are already installed via:

```bash
npm install @privy-io/react-auth @privy-io/wagmi viem@^2.x wagmi@^2.x
```

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in terminal).

## Features Implemented

### Authentication Flow

1. **Unauthenticated State**

   - Shows "Sign In" button in navbar
   - Clicking opens Privy modal with all login methods

2. **Authenticated State**
   - Shows wallet address (shortened) in navbar
   - Shows network switcher (Monad / Base)
   - Shows avatar with first letter of email or address

### Wallet Dropdown

When authenticated, clicking the wallet address reveals:

- **Wallet Address** - Full address display
- **Copy Address** - Copies address to clipboard
- **Buy Crypto** - Opens Moonpay onramp modal (key feature!)
- **Export Wallet** - Exports private key (embedded wallets only)
- **View on Explorer** - Opens block explorer
- **Sign Out** - Logs out and clears session

### Network Switching

- Switch between Monad Testnet and Base Sepolia
- Visual indicators (purple dot for Monad, blue for Base)
- Toast notifications on successful switch
- Error handling with user-friendly messages

## Architecture

```
App.tsx
├── PrivyProvider (authentication)
│   └── QueryClientProvider (react-query)
│       └── WagmiProvider (contract interactions)
│           └── Pages & Components
│               ├── Navbar
│               │   ├── LoginButton
│               │   ├── NetworkSwitcher
│               │   └── WalletInfo
│               └── Index (main app)
```

## Key Files

- `src/lib/privy.ts` - Privy configuration (login methods, appearance, chains)
- `src/lib/wagmi.ts` - Wagmi config for Monad + Base
- `src/lib/chains.ts` - Chain definitions
- `src/components/wallet/LoginButton.tsx` - Authentication trigger
- `src/components/wallet/WalletInfo.tsx` - Wallet dropdown with onramp
- `src/components/wallet/NetworkSwitcher.tsx` - Chain switcher
- `src/components/layout/Navbar.tsx` - Top navigation

## Testing Checklist

- [ ] Privy App ID configured in `.env`
- [ ] Login modal opens on "Sign In" click
- [ ] Email login works (OTP sent)
- [ ] Google OAuth works
- [ ] Twitter OAuth works
- [ ] MetaMask connection works
- [ ] Network switcher changes chain
- [ ] Copy address works (clipboard)
- [ ] Buy Crypto opens Moonpay (sandbox mode)
- [ ] Export wallet works (embedded wallets)
- [ ] Explorer link opens correctly
- [ ] Sign out clears session

## Troubleshooting

### "Privy App ID not configured"

- Check `.env` file exists in `rebased/frontend/`
- Verify `VITE_PRIVY_APP_ID` is set correctly
- Restart dev server after changing `.env`

### Moonpay doesn't open

- Ensure fiat on-ramp is enabled in Privy dashboard
- Check sandbox mode is enabled for testing
- Verify browser allows popups

### Network switch fails

- Check RPC URLs are accessible
- Verify chain IDs match Privy dashboard config
- Check wallet has sufficient balance for gas

### Login methods missing

- Verify login methods are enabled in Privy dashboard
- Check OAuth credentials are configured (Google, Twitter)
- Clear browser cache and retry

## Next Steps

After wallet infrastructure is complete:

1. **Token Selection Modal** - Search and select assets
2. **Portfolio Configuration** - Adjust weights, triggers, actions
3. **Strategy Deployment** - Deploy strategy contract on-chain
4. **Delegation Setup** - Sign EIP-712 delegation for bot
5. **Deposit Flow** - Approve and deposit assets
6. **Portfolio Dashboard** - Track positions and rebalances

## Resources

- [Privy Docs](https://docs.privy.io)
- [Privy Dashboard](https://dashboard.privy.io)
- [Wagmi Docs](https://wagmi.sh)
- [Viem Docs](https://viem.sh)
- [Moonpay Docs](https://docs.moonpay.com)

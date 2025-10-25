# Rebased Frontend

Visual strategy builder for automated crypto portfolio rebalancing on Base.

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Add your Privy App ID

# Run
npm run dev
```

Access: http://localhost:5173

## Features

### Visual Strategy Builder
Build rebalancing strategies by connecting blocks:
```
START → ASSETS → CONDITION → ACTION → END
```

### Block Types
- **START**: Entry point with strategy name
- **ASSETS**: Define tokens and target weights (must sum to 100%)
- **CONDITION**: Add rules (IF price > $5000)
- **ACTION**: Execute changes (THEN shift to 50/50)
- **END**: Complete and deploy strategy

### User Flow

```
User                  Frontend                 Smart Contract
 │                      │                           │
 │  1. Connect Wallet   │                           │
 │ ────────────────────>│                           │
 │                      │  2. Check/Create          │
 │                      │     DeleGator             │
 │                      │ ─────────────────────────>│
 │                      │ <─────────────────────────│
 │                      │                           │
 │  3. Build Strategy   │                           │
 │ ────────────────────>│                           │
 │                      │  4. Save to Backend       │
 │                      │ ───────>Backend           │
 │                      │                           │
 │  5. Deploy Strategy  │                           │
 │ ────────────────────>│                           │
 │                      │  6. deployStrategy()      │
 │                      │ ─────────────────────────>│
 │                      │ <─────────────────────────│
 │                      │                           │
 │  7. Sign Delegation  │                           │
 │ ────────────────────>│                           │
 │                      │  8. Store Delegation      │
 │                      │ ───────>Backend           │
 │                      │                           │
 │  Done! Bot monitors  │                           │
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | React 18 + Vite |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | Zustand |
| **Canvas** | React Flow |
| **Wallet** | Privy + Viem |
| **Blockchain** | Viem (Base) |

## Configuration

```bash
# Privy (Required)
VITE_PRIVY_APP_ID=your-privy-app-id

# Backend API
VITE_BACKEND_URL=http://localhost:3000

# RPC URLs
VITE_BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Contract Addresses (Base Mainnet)
VITE_BASE_MAINNET_DELEGATION_MANAGER=0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3
VITE_BASE_MAINNET_STRATEGY_REGISTRY=0x051790142C92E55C88d45469419CBC74735bDec5
VITE_BASE_MAINNET_EXECUTOR=0xE5937713Ed44977dBBBdFF63aDab110e2A8aFF57
```

## Project Structure

```
src/
├── components/
│   ├── blocks/          # Strategy blocks (START, ASSETS, etc.)
│   ├── wizard/          # Deployment wizard
│   ├── delegation/      # Delegation management
│   └── ui/              # shadcn/ui components
├── hooks/
│   ├── useDelegation.ts # Delegation signing
│   ├── useStrategy.ts   # Strategy management
│   └── useAuth.ts       # SIWE authentication
├── lib/
│   ├── api/             # Backend API clients
│   ├── utils/           # Helpers (delegation signatures)
│   └── chains.ts        # Chain configs
└── store/               # Zustand stores
```

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Lint code
```

## Deployment

```bash
# Build
npm run build

# Output: dist/
```

Deploy `dist/` folder to:
- Vercel
- Netlify
- Any static hosting

## Key Features

### 1. Wallet Connection
- Privy integration for easy onboarding
- MetaMask, WalletConnect support
- SIWE authentication

### 2. Strategy Builder
- Drag-and-drop block interface
- Real-time validation
- Token selector with prices
- Weight sliders (auto-sum to 100%)

### 3. Smart Account
- Automatic DeleGator detection
- One-click deployment
- MetaMask Delegation Framework

### 4. Delegation Signing
- EIP-712 typed signatures
- 1-year expiry (configurable)
- Specific delegate (RebalanceExecutor)

### 5. Real-Time Updates
- Strategy status monitoring
- Rebalance notifications
- Portfolio drift tracking

## Environment Support

- **Base Mainnet** (Production)
- **Base Sepolia** (Testnet)

## License

MIT

---

Build automated crypto strategies visually


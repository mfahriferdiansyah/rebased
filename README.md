# Rebased

**Non-custodial portfolio automation platform powered by MetaMask smart accounts on Base.**

Automate your crypto portfolio strategies (swap, transfer, rebalance) based on conditions you define, while maintaining full control through MetaMask DeleGator.

**Production Deployment:** Base Mainnet (Chain ID: 8453)

---

## What is Rebased?

Rebased transforms manual portfolio management into automated strategies. Define your conditions once, let the system execute automatically—no custodial risk.

### Key Features

- **AI Builder Assistant** - Natural language to strategy canvas using OpenAI LLM
- **Visual Canvas** - Drag-and-drop strategy builder with conditions and actions
- **Automated Execution** - Bot monitors and executes based on your rules
- **Non-Custodial** - MetaMask DeleGator ensures you always control your funds
- **Revocable Anytime** - Disable automation with one click
- **Production Ready** - Deployed on Base Mainnet with verified contracts

### Core Capabilities

**Rebalance** - Maintain target allocations automatically

```
STRATEGY: 60% WETH, 40% USDC
IF drift > 5% THEN rebalance to target

This creates automatic rebalancing that:
- Always takes profit when assets appreciate
- Always buys the dip when assets decline
- Accumulates when prices drop
- Secures gains automatically
```

**Swap** - Exchange tokens based on price or conditions

```
IF WETH_price < $3,000 THEN swap 50% USDC for WETH
```

**Transfer** - Move profits to main wallet when conditions met

```
IF portfolio_value > $10,000 THEN transfer 10% USDC to main_wallet
```

**Flexibility** - Actions and conditions can be chained together

```
Drag-and-drop canvas. Zero coding knowledge. Zero complexity.
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER DEFINES STRATEGY                                        │
│                                                                  │
│  Natural Language Input                                         │
│  "Rebalance 60/40 WETH/USDC when drift > 5%"                    │
│                    │                                             │
│                    ▼                                             │
│              AI Translation (OpenAI LLM)                         │
│                    │                                             │
│                    ▼                                             │
│         Visual Strategy Canvas (Drag & Drop)                    │
│         ┌─────────────────────────────────┐                     │
│         │ ASSETS: 60% WETH, 40% USDC      │                     │
│         │ CONDITION: drift > 5%           │                     │
│         │ ACTION: Rebalance to target     │                     │
│         └─────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SETUP AUTOMATION                                             │
│                                                                  │
│  Create MetaMask DeleGator ──► Transfer Funds ──► Delegate Bot  │
│  (Smart Account)              (Non-Custodial)   (Revocable)     │
│                                                                  │
│  Result: Bot authorized with limited permissions                │
│          • Only rebalance operations                            │
│          • Only your strategy                                   │
│          • Revocable anytime via delegation                     │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. BOT MONITORS & EXECUTES                                      │
│                                                                  │
│  Monitor Loop (every 30s)                                       │
│         │                                                        │
│         ├──► Check Condition: drift = 7% (> 5% threshold)       │
│         │                                                        │
│         ├──► Get Prices (Pyth Oracle on Base)                   │
│         │                                                        │
│         ├──► Calculate Swaps: 0.5 WETH → 1,800 USDC             │
│         │                                                        │
│         ├──► Execute via Delegation                             │
│         │    └─> DelegationManager validates signature          │
│         │    └─> RebalanceExecutor orchestrates swaps           │
│         │    └─> 0x Protocol executes trades (best price)       │
│         │                                                        │
│         └──► Portfolio Rebalanced ✓                             │
│              New allocation: 60.1% WETH, 39.9% USDC             │
│              Drift: 0.2% (< 5%)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Vite)                                          │
│  • AI Chat Interface (OpenAI integration)                        │
│  • Strategy Canvas (React Flow)                                  │
│  • Wallet Connection (Privy)                                     │
│  • Setup Wizard (DeleGator creation)                             │
│  • Portfolio Dashboard                                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ BACKEND (NestJS)                                                 │
│  • API Server - Strategy CRUD, SIWE auth, delegation mgmt       │
│  • Bot Worker - Monitors strategies (30s), executes rebalances  │
│  • PostgreSQL - Strategy/delegation storage                     │
│  • Redis - Job queues (Bull)                                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ CONTRACTS (Solidity - Base Mainnet)                              │
│  • DelegationManager - MetaMask v1.3.0 (ERC-7710)                │
│  • RebalanceExecutor - Triple security layer orchestration       │
│  • StrategyRegistry - On-chain strategy storage                  │
│  • PythOracle - Real-time price feeds                            │
│  • UniswapHelper - DEX swap execution (V2)                       │
│  • RebalancerConfig - System configuration                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ INTEGRATIONS                                                     │
│  • MetaMask DeleGator - Smart accounts with delegation           │
│  • Pyth Network - Real-time oracle price feeds                   │
│  • 0x Protocol - DEX aggregator (best execution)                 │
│  • Uniswap V2 - On-chain swaps                                   │
│  • OpenAI - Natural language to strategy translation            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Production Deployment - Base Mainnet

**Network:** Base (Chain ID: 8453)
**Deployed:** 2025-10-24
**Version:** v1.4.0 (Bot Authorization)

### Contract Addresses

| Contract | Address |
|----------|---------|
| **DelegationManager** | `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3` |
| **StrategyRegistry** | `0x051790142C92E55C88d45469419CBC74735bDec5` |
| **RebalanceExecutor** | `0xE5937713Ed44977dBBBdFF63aDab110e2A8aFF57` |
| **PythOracle** | `0x3727aa26BFA5b995A17551425d3cDDce24df9f10` |
| **UniswapHelper** | `0x32ff846b58baf82Ad30f64756D3a069d0AdBf707` |
| **RebalancerConfig** | `0xCC7EB3C51b19E14b3B39996c673a596274115090` |

All contracts verified on [Basescan](https://base.blockscout.com/)

### Security Model

```
┌──────────────────────────────────────────────────────────┐
│              TRIPLE SECURITY LAYER                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: Bot Authorization                             │
│  └─ Only whitelisted bot EOA can call rebalance()       │
│                                                          │
│  Layer 2: Delegation Validation                         │
│  └─ EIP-712 signature verification                      │
│  └─ Checks delegation is active and not expired         │
│  └─ Validates delegate is RebalanceExecutor             │
│                                                          │
│  Layer 3: Business Logic                                │
│  └─ DEX whitelist (only approved DEXs)                  │
│  └─ Slippage protection (max 1%)                        │
│  └─ Strategy ownership validation                       │
│  └─ Price staleness checks                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Why Rebased?

### Traditional Challenges

- Manual portfolio management is time-consuming
- Miss optimal rebalance opportunities (24/7 markets)
- Emotional decision-making leads to losses
- Centralized bots require custody (high risk)

### Rebased Solution

- **AI-Powered** - Natural language strategy creation with OpenAI
- **Automated** - Bot executes 24/7 based on your rules
- **Non-Custodial** - Funds stay in your MetaMask smart account
- **Programmable** - Fine-grained control via delegation
- **Revocable** - Disable automation instantly on-chain
- **Transparent** - All transactions visible on Basescan
- **Production Ready** - Deployed and tested on Base Mainnet

---

## Quick Start

### Prerequisites

- MetaMask wallet
- Funds on Base Mainnet (WETH, USDC, or other supported tokens)

### Setup (3 Steps)

**1. Connect Wallet**

```
Open Rebased → Connect MetaMask → Sign SIWE message
```

**2. Create Strategy**

```
AI Chat: "I want to rebalance 60% WETH, 40% USDC when drift exceeds 5%"
→ AI generates strategy canvas → Review and customize
→ Deploy to StrategyRegistry
```

**3. Setup Delegation**

```
Create DeleGator → Transfer funds → Sign EIP-712 delegation
→ Bot monitors every 30s → Auto-executes when conditions met
```

---

## Repository Structure

```
rebased/
├── frontend/         # React + Vite UI with strategy canvas
│   ├── docs/        # Frontend documentation
│   │   └── scripts/         # Test/verification scripts
│   └── src/
│       ├── components/      # React components
│       ├── hooks/           # Custom hooks (delegation, strategy)
│       └── lib/             # API clients, utilities
│
├── backend/          # NestJS API + Bot worker
│   ├── apps/
│   │   ├── api/     # REST API server (port 3000)
│   │   └── bot/     # Strategy execution worker (30s interval)
│   ├── libs/        # Shared libraries (prisma, blockchain)
│   └── docs/        # Backend documentation
│       ├── scripts/         # Test/verification scripts
│       └── logs/            # Execution logs
│
└── contract/         # Solidity smart contracts (Foundry)
    ├── src/         # Contract implementations
    ├── script/      # Deployment scripts (Deploy.s.sol)
    └── docs/        # Contract architecture docs
        ├── scripts/         # Test/verification scripts
        └── BASE-MAINNET-DEPLOYMENT-SUMMARY.md
```

---

## Documentation

Each component has detailed documentation in its `/docs` folder:

- **[Frontend README](./frontend/README.md)** - Visual strategy builder, wallet integration
- **[Backend README](./backend/README.md)** - API server, bot worker, system architecture
- **[Contract README](./contract/README.md)** - Smart contracts, security model, deployment

### Key Documentation Files

- **[Base Mainnet Deployment](./contract/docs/BASE-MAINNET-DEPLOYMENT-SUMMARY.md)** - Complete deployment details
- **[Delegation Manager Fix](./contract/docs/20251025-delegation-manager-fix.md)** - DelegationManager update
- **[DEX Approval Fix](./contract/docs/20251025-unapproved-dex-fix.md)** - 0x Protocol whitelist
- **[Codebase Cleanup](./backend/docs/20251025-codebase-cleanup.md)** - File organization
- **[README Update](./backend/docs/20251025-readme-update.md)** - Documentation updates

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Frontend** | React + Vite + TypeScript | 18 / 5.0 |
| **UI Library** | Tailwind CSS + shadcn/ui | 3.4 |
| **Canvas** | React Flow | 11.11 |
| **Wallet** | Privy + Viem | 2.38 |
| **Backend** | NestJS + TypeScript | 10 / 5.3 |
| **Database** | PostgreSQL + Prisma | 16 / 5.8 |
| **Cache/Queue** | Redis + Bull | 7 / 4.12 |
| **Blockchain** | Viem (Base) | 2.38 |
| **Contracts** | Solidity + Foundry | 0.8.23 |
| **Oracle** | Pyth Network | Latest |
| **DEX** | 0x Protocol + Uniswap V2 | Latest |
| **Delegation** | MetaMask v1.3.0 (ERC-7710) | 1.3.0 |
| **AI** | OpenAI GPT-4 | Latest |

---

## Security

### Non-Custodial Design

- Funds remain in your MetaMask DeleGator (smart account)
- Bot cannot withdraw to external addresses
- All permissions revocable instantly via delegation revocation
- User controls all assets at all times

### Delegation Security

- **ERC-7710** - MetaMask Delegation Framework (audited)
- **EIP-712** - Typed structured data signing
- **ERC-4337** - Smart account standard
- **ERC-7579** - Execution format for delegations
- **TimestampEnforcer** - 1-year expiry (configurable)
- **Specific Delegate** - Only RebalanceExecutor can execute
- **Revocable** - User can revoke delegation anytime

### Smart Contract Security

- **Bot Authorization** - Only whitelisted EOA can execute
- **DEX Whitelist** - Only approved DEXs (0x, Uniswap)
- **UUPS Upgradeable** - Proxy pattern for all contracts
- **Slippage Protection** - Max 1% slippage on swaps
- **Price Staleness** - Pyth price age checks
- **Reentrancy Guards** - NonReentrant on critical functions
- **Access Control** - Owner-only administrative functions

### Audits

- MetaMask DelegationManager v1.3.0 (audited by MetaMask)
- Custom contracts (in-house testing and verification)

---

## Use Cases

### Portfolio Management

- **Rebalancing** - Maintain 60/40 WETH/USDC allocation
- **Dollar-Cost Averaging** - Buy $100 WETH weekly
- **Risk Management** - Convert to USDC if portfolio drops 20%

### Trading Strategies

- **Take Profit** - Sell 25% when asset gains 50%
- **Buy the Dip** - Accumulate when price drops 15%
- **Trend Following** - Increase allocation when momentum positive

### Yield Optimization

- **Profit Extraction** - Transfer yields to main wallet monthly
- **Compound Rewards** - Reinvest staking rewards automatically
- **Portfolio Drift** - Auto-rebalance when allocation drifts

---

## Development Setup

### 1. Contracts (Foundry)

```bash
cd contract
forge install
cp .env.example .env  # Add PRIVATE_KEY, BASE_MAINNET_RPC_URL
forge test            # Run tests
forge build           # Compile contracts
```

**Deploy to Base Mainnet:**
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify
```

### 2. Backend (NestJS)

```bash
cd backend
npm install
npm run prisma:generate
cp .env.example .env  # Add DATABASE_URL, contract addresses

# Start infrastructure
docker-compose up -d

# Run migrations
npm run prisma:migrate

# Test build (don't run server in development)
npm run build
```

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env  # Add VITE_PRIVY_APP_ID, contract addresses

# Test build (don't run dev server in development)
npm run build
```

---

## Supported Networks

- **Base Mainnet** (Production - Chain ID: 8453)
- **Base Sepolia** (Testnet - Chain ID: 84532)

---

## Links

- **Documentation**: `/rebased/*/docs/`
- **MetaMask Delegation**: https://docs.metamask.io/delegation-toolkit/
- **Pyth Network**: https://docs.pyth.network/
- **Base**: https://base.org/
- **0x Protocol**: https://0x.org/docs/

---

## License

MIT

---

**Built with MetaMask DeleGator | Powered by OpenAI & Pyth Oracle | Secured by ERC-7710 | Deployed on Base**

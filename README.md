# Rebased

**Non-custodial portfolio automation platform powered by AI and MetaMask smart accounts.**

Automate your crypto portfolio strategies (swap, transfer, rebalance) based on conditions you define, while maintaining full control through MetaMask DeleGator.

---

## What is Rebased?

Rebased transforms manual portfolio management into automated strategies. Define your conditions once, let the system execute automatically—no custodial risk.

### Key Features

- **AI Builder Assistant** - Natural language to strategy canvas using OpenAI LLM
- **Visual Canvas** - Drag-and-drop strategy builder with conditions and actions
- **Automated Execution** - Bot monitors and executes based on your rules
- **Non-Custodial** - MetaMask DeleGator ensures you always control your funds
- **Revocable Anytime** - Disable automation with one click

### Core Capabilities

**Transfer** - Move profits to main wallet when conditions met

```
IF portfolio_value > $10,000 THEN transfer 10% USDC to main_wallet
```

**Swap** - Exchange tokens based on price or conditions

```
IF ETH_price < $2,000 THEN swap 50% USDC for ETH
```

**Rebalance** - Maintain target allocations automatically

```
STRATEGY: 70% ETH, 30% USDC
IF drift > 5% THEN rebalance to target
This will create automatic rebalancing make the portofolio to Always take profit, Always buy the dip.
```

**Buy the Dip** - Accumulate when price drops

```
IF ETH_price drops 10% in 24h THEN swap $500 USDC for ETH
```

**Take Profit** - Secure gains automatically

```
IF ETH gains 20% THEN swap 25% ETH for USDC
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER DEFINES STRATEGY                                        │
│                                                                  │
│  Natural Language Input                                         │
│  "Rebalance 50/50 ETH/USDC when drift > 5%"                     │
│                    │                                             │
│                    ▼                                             │
│              AI Translation (OpenAI LLM)                         │
│                    │                                             │
│                    ▼                                             │
│         Visual Strategy Canvas (Drag & Drop)                    │
│         ┌─────────────────────────────────┐                     │
│         │ Trigger: Drift Detection        │                     │
│         │ Condition: drift > 5%           │                     │
│         │ Action: Rebalance to 50/50      │                     │
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
│          • Only rebalance                                        │
│          • Only your strategy                                    │
│          • Revocable anytime                                     │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. BOT MONITORS & EXECUTES                                      │
│                                                                  │
│  Monitor Loop (every 5min)                                      │
│         │                                                        │
│         ├──► Check Condition: drift = 7% (> 5% threshold)       │
│         │                                                        │
│         ├──► Get Prices (Pyth Oracle)                           │
│         │                                                        │
│         ├──► Calculate Swaps: 126 MON → 409 USDC                │
│         │                                                        │
│         ├──► Execute via Delegation                             │
│         │    └─> DelegationManager validates permissions        │
│         │    └─> RebalanceExecutor orchestrates swaps           │
│         │    └─> UniswapHelper/Monorail executes trades         │
│         │                                                        │
│         └──► Portfolio Rebalanced ✓                             │
│              New allocation: 50.1% MON, 49.9% USDC              │
│              Drift: 0.2% (< 5%)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ FRONTEND (React/Next.js)                                         │
│  • AI Chat Interface (OpenAI integration)                        │
│  • Strategy Canvas (Drag & Drop)                                 │
│  • Setup Wizard (DeleGator creation)                             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ BACKEND (NestJS)                                                 │
│  • API Server - Strategy CRUD, delegation management            │
│  • Bot Worker - Monitors strategies, executes rebalances        │
│  • Indexer - Tracks blockchain events                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ CONTRACTS (Solidity)                                             │
│  • DelegationManager - MetaMask v1.3.0 delegation framework      │
│  • RebalanceExecutor - Orchestrates portfolio rebalancing        │
│  • StrategyRegistry - Stores strategy definitions                │
│  • PythOracle - Real-time price feeds                            │
│  • UniswapHelper - DEX swap execution                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ INTEGRATIONS                                                     │
│  • MetaMask DeleGator - Smart accounts with delegation           │
│  • Pyth Network - Oracle price feeds                             │
│  • Uniswap V2 / Monorail - Decentralized exchanges               │
│  • OpenAI - Natural language to strategy translation            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Why Rebased?

### Traditional Challenges

- Manual portfolio management is time-consuming
- Miss optimal rebalance opportunities
- Emotional decision-making leads to losses
- Centralized bots require custody (risk)

### Rebased Solution

- **Automated** - Bot executes 24/7 based on your rules
- **Non-Custodial** - Funds stay in your MetaMask smart account
- **Programmable** - Fine-grained control via delegation caveats
- **Revocable** - Disable automation instantly
- **AI-Powered** - Natural language strategy creation
- **Visual** - See exactly what will execute before enabling

---

## Quick Start

### Prerequisites

- MetaMask wallet
- Funds on supported chains (Base, Monad)

### Setup (3 Steps)

**1. Define Strategy**

```
Open Rebased → Create Strategy → Describe in natural language
AI translates to visual canvas → Customize conditions/actions
```

**2. Setup Automation**

```
Create DeleGator → Transfer funds → Delegate to bot
(Guided wizard handles entire flow)
```

**3. Monitor**

```
Bot monitors conditions → Executes when triggered
View history and analytics in dashboard
```

---

## Repository Structure

```
rebased/
├── frontend/         # React/Next.js UI with AI chat and canvas
│   ├── docs/        # Frontend documentation
│   └── src/         # Components, hooks, pages
│
├── backend/          # NestJS API, bot worker, indexer
│   ├── apps/
│   │   ├── api/     # REST API server
│   │   ├── bot/     # Strategy execution worker
│   │   └── indexer/ # Blockchain event indexer
│   └── docs/        # Backend documentation
│
├── contract/         # Solidity smart contracts
│   ├── src/         # Contract implementations
│   ├── script/      # Deployment scripts
│   └── docs/        # Contract architecture docs
│
└── indexer/          # Event indexing service
```

---

## Supported Chains

- **Base Sepolia** (Testnet)
- **Monad Testnet**
- More coming soon

---

## Documentation

- **[Frontend Docs](./frontend/docs/)** - UI implementation, wizard setup
- **[Backend Docs](./backend/docs/)** - API, bot architecture, troubleshooting
- **[Contract Docs](./contract/docs/)** - Architecture, security model, integration guide

---

## Security

### Non-Custodial Design

- Funds remain in your MetaMask DeleGator
- Bot cannot withdraw to external addresses
- All permissions revocable instantly

### Delegation Security

- ERC-7710 standard delegation
- Fine-grained caveats (target, method, time, call limits)
- MetaMask framework v1.3.0 (audited)

### Smart Contract Security

- UUPS upgradeable proxies (5 contracts)
- Owner-controlled upgrades
- Slippage protection
- Price staleness checks
- Reentrancy guards

---

## Use Cases

### Portfolio Management

- **Rebalancing** - Maintain 60/40 BTC/ETH allocation
- **Dollar-Cost Averaging** - Buy $100 ETH weekly
- **Risk Management** - Convert to stablecoins if portfolio drops 20%

### Trading Strategies

- **Take Profit** - Sell 25% when asset gains 50%
- **Buy the Dip** - Accumulate when price drops 15%
- **Trend Following** - Increase allocation when momentum positive

### Yield Optimization

- **Profit Extraction** - Transfer yields to main wallet monthly
- **Compound Rewards** - Reinvest staking rewards automatically
- **Tax Loss Harvesting** - Realize losses for tax optimization

---

## Setup & Run

### 1. Contracts

```bash
cd contract
forge install
cp .env.example .env  # Add PRIVATE_KEY, RPC_URL
forge script script/DeployAll.s.sol --rpc-url $RPC_URL --broadcast
./scripts/configure-oracle.sh <chain>  # CRITICAL
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env  # Add DATABASE_URL, contract addresses
npx prisma migrate dev
npm run build  # Test build
npm run start:dev

npm run start:bot
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # Add NEXT_PUBLIC_*, API_URL
npm run build  # Test build
```

---

## Links

- **Docs**: `/rebased/*/docs/`
- **MetaMask**: https://docs.metamask.io/delegation-toolkit/
- **Pyth**: https://docs.pyth.network/

---

**Built with MetaMask DeleGator | Powered by Pyth Oracle | Secured by ERC-7710**

# Rebased Smart Contracts

Non-custodial portfolio automation platform deployed on Base Mainnet. Automated rebalancing with MetaMask Delegation Framework (EIP-7710).

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

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  USER'S SMART ACCOUNT                    │
│              (MetaMask DeleGator)                        │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ Strategy:  60% WETH, 40% USDC                  │     │
│  │ Delegated to: RebalanceExecutor                │     │
│  │ Bot: Authorized EOA                            │     │
│  └────────────────────────────────────────────────┘     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ (EIP-712 Delegation)
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│              REBALANCE EXECUTOR                          │
│                                                          │
│  Security Layers:                                        │
│  1. Bot Authorization (isAuthorizedBot)                  │
│  2. Delegation Validation (EIP-712)                      │
│  3. Business Logic (slippage, DEX whitelist)             │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐      │
│  │  Pyth      │  │ Uniswap    │  │ 0x Protocol  │      │
│  │  Oracle    │  │ Helper     │  │ (whitelisted)│      │
│  └────────────┘  └────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────┘
```

## User Flow

```
User                   Smart Account            RebalanceExecutor        Blockchain
 │                          │                         │                    │
 │ 1. Connect Wallet        │                         │                    │
 │ ───────────────────────> │                         │                    │
 │                          │                         │                    │
 │ 2. Deploy DeleGator      │                         │                    │
 │ ──────────────────────────────────────────────────────────────────────>│
 │ <──────────────────────────────────────────────────────────────────────│
 │                          │                         │                    │
 │ 3. Deploy Strategy       │                         │                    │
 │ ───────────────────────> │                         │                    │
 │                          │ 4. deployStrategy()     │                    │
 │                          │ ──────────────────────────────────────────> │
 │                          │ <────────────────────────────────────────── │
 │                          │                         │                    │
 │ 5. Sign Delegation       │                         │                    │
 │    (EIP-712)             │                         │                    │
 │ ───────────────────────> │                         │                    │
 │                          │                         │                    │
 │                          │                         │                    │
 │                          │    BOT MONITORING LOOP  │                    │
 │                          │                         │                    │
 │                          │ 6. Check Drift          │                    │
 │                          │ <──────────────────────>│                    │
 │                          │                         │                    │
 │                          │ 7. Get Pyth Prices      │                    │
 │                          │ <──────────────────────>│                    │
 │                          │                         │                    │
 │                          │ 8. rebalance()          │                    │
 │                          │ <───────────────────────│                    │
 │                          │                         │ 9. Execute Swaps   │
 │                          │ ───────────────────────────────────────────>│
 │                          │ <──────────────────────────────────────────│
 │                          │                         │                    │
 │ 10. Notify User          │                         │                    │
 │ <───────────────────────────────────────────────────                    │
```

## Core Contracts

### 1. DelegationManager
**MetaMask's official implementation (v1.3.0)**
- EIP-712 signature validation
- Delegation lifecycle management
- TimestampEnforcer for expiry control

### 2. StrategyRegistry
**User strategy deployment and management**
- Create strategies with token allocations
- Store target weights and rebalance intervals
- Link to user's DeleGator account

### 3. RebalanceExecutor
**Automated rebalancing with triple security**
```
Security Layer 1: Bot Authorization
  ├─ Only whitelisted bot EOA can call
  └─ Owner sets: setBotAuthorization(botEOA, true)

Security Layer 2: Delegation Validation
  ├─ Verifies EIP-712 signature
  ├─ Checks delegation is active
  └─ Validates delegate is RebalanceExecutor

Security Layer 3: Business Logic
  ├─ DEX whitelist (approvedDEXs mapping)
  ├─ Slippage protection
  └─ Strategy ownership validation
```

### 4. PythOracle
**Real-time price feeds**
- Pyth Network integration
- Staleness checks
- Batch price queries for gas optimization

### 5. UniswapHelper & 0x Integration
**DEX execution**
- Uniswap V2 for simple swaps
- 0x Protocol for best execution
- Slippage protection on all swaps

## Quick Start

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Base RPC URL (Alchemy recommended)

### Installation

```bash
forge install
```

### Configuration

```bash
cp .env.example .env
```

Required:
```bash
PRIVATE_KEY=<deployer_private_key>
CHAIN_NAME=base-mainnet
PYTH_CONTRACT=0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
UNISWAP_V2_ROUTER=0xfB8e1C3b833f9E67a71C859a132cf783b645e436
UNISWAP_V2_FACTORY=0x733E88f248b742db6C14C0b1713Af5AD7fDd59D0
```

### Testing

```bash
# Run all tests
forge test

# Verbose output
forge test -vvv

# Gas report
forge test --gas-report
```

## Deployment

### Deploy to Base Mainnet

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify
```

### Post-Deployment Setup

**1. Authorize Bot EOA**
```bash
cast send 0xE5937713Ed44977dBBBdFF63aDab110e2A8aFF57 \
  "setBotAuthorization(address,bool)" \
  <BOT_EOA> \
  true \
  --private-key <DEPLOYER_KEY> \
  --rpc-url https://mainnet.base.org
```

**2. Whitelist 0x Protocol**
```bash
cast send 0xE5937713Ed44977dBBBdFF63aDab110e2A8aFF57 \
  "setDEXApproval(address,bool)" \
  0x0000000000001ff3684f28c67538d4d072c22734 \
  true \
  --private-key <DEPLOYER_KEY> \
  --rpc-url https://mainnet.base.org
```

## Contract Interactions

### Check Bot Authorization
```bash
cast call 0xE5937713Ed44977dBBBdFF63aDab110e2A8aFF57 \
  "isAuthorizedBot(address)(bool)" \
  <BOT_ADDRESS> \
  --rpc-url https://mainnet.base.org
```

### Check DEX Approval
```bash
cast call 0xE5937713Ed44977dBBBdFF63aDab110e2A8aFF57 \
  "approvedDEXs(address)(bool)" \
  0x0000000000001ff3684f28c67538d4d072c22734 \
  --rpc-url https://mainnet.base.org
```

### Get Strategy Details
```bash
cast call 0x051790142C92E55C88d45469419CBC74735bDec5 \
  "strategies(uint256)" \
  <STRATEGY_ID> \
  --rpc-url https://mainnet.base.org
```

## Security Features

- **Bot Authorization**: Only whitelisted EOA can execute rebalances
- **DEX Whitelist**: Only approved DEX contracts can be used
- **Delegation Validation**: EIP-712 signature verification
- **Timestamp Enforcer**: 1-year expiry on delegations
- **UUPS Upgradeability**: All contracts upgradeable via proxy
- **Reentrancy Protection**: NonReentrant on critical functions
- **Access Control**: Owner-only administrative functions

## Upgrading Contracts

```bash
# Deploy new implementation
forge script script/Upgrade.s.sol:UpgradeExecutor \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify

# Verify upgrade
cast call <PROXY_ADDRESS> "getVersion()(string)" \
  --rpc-url https://mainnet.base.org
```

## Configuration

### Default Values
- **Max Slippage**: 100 bps (1%)
- **Bot Rebalance Interval**: 30 seconds
- **Delegation Expiry**: 1 year (31536000 seconds)

### Modify Config
```solidity
rebalancerConfig.setMaxSlippage(50); // 0.5%
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Language** | Solidity ^0.8.23 |
| **Framework** | Foundry |
| **Oracle** | Pyth Network |
| **DEX** | Uniswap V2 + 0x Protocol |
| **Delegation** | MetaMask v1.3.0 (EIP-7710) |
| **Proxy Pattern** | UUPS (OpenZeppelin) |

## Documentation

- **[Deployment Summary](./docs/BASE-MAINNET-DEPLOYMENT-SUMMARY.md)** - Complete deployment details
- **[Delegation Manager Fix](./docs/20251025-delegation-manager-fix.md)** - DelegationManager update
- **[DEX Approval Fix](./docs/20251025-unapproved-dex-fix.md)** - 0x Protocol whitelist

## License

MIT

---

Production-ready automated portfolio rebalancing on Base Mainnet

# Rebased Smart Contracts

AI-powered portfolio automation platform with multi-chain support (Monad + Base Sepolia). Non-custodial automated rebalancing using MetaMask Delegation (ERC-7710).

## 📚 Documentation

**See [docs/](./docs/) folder for comprehensive documentation:**
- **[System Verification](./docs/SYSTEM_VERIFICATION_COMPLETE.md)** - Complete system verification report ✅
- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Full deployment instructions for multi-chain
- **[Security Fixes](./docs/SECURITY_FIXES_IMPLEMENTED.md)** - Security implementation tracking
- **[Implementation Complete](./docs/IMPLEMENTATION_COMPLETE.md)** - Implementation summary
- **[Project Status](./docs/PROJECT_STATUS.md)** - Current project status

## Overview

Rebased enables users to create automated portfolio rebalancing strategies with:
- **Automated Rebalancing**: Execute rebalances based on drift thresholds
- **Price Oracle Integration**: Real-time prices from Switchboard on Monad
- **DEX Integration**: Uniswap V2 for token swaps
- **Delegation Support**: Authorize bots to execute rebalances (ERC-7710 compatible)
- **Upgradeable**: All contracts use UUPS proxy pattern

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      StrategyVault                          │
│  - Strategy management                                      │
│  - Rebalancing logic                                        │
│  - Delegation (ERC-7710)                                    │
└───────┬──────────────┬──────────────┬──────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│Switchboard   │ │UniswapHelper │ │Rebalancer    │
│Oracle        │ │              │ │Config        │
│              │ │              │ │              │
│- Price feeds │ │- Swap exec   │ │- Fees        │
│- Validation  │ │- Slippage    │ │- Thresholds  │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Core Contracts

### 1. SwitchboardOracle
Price oracle wrapper with validation.
- **Location**: `src/SwitchboardOracle.sol`
- **Features**: Staleness checks, batch queries, multi-token support
- **Version**: 1.0.0

### 2. RebalancerConfig
System-wide configuration storage.
- **Location**: `src/RebalancerConfig.sol`
- **Features**: Fee management, slippage settings, token whitelist
- **Version**: 1.0.0

### 3. UniswapHelper
Uniswap V2 interaction wrapper.
- **Location**: `src/UniswapHelper.sol`
- **Features**: Swap execution, quote functions, slippage protection
- **Version**: 1.0.0

### 4. StrategyVault
Main vault for automated rebalancing.
- **Location**: `src/StrategyVault.sol`
- **Features**: Strategy management, rebalancing, delegation, deposits/withdrawals
- **Version**: 1.0.0

## Setup

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Git

### Install Dependencies

```bash
forge install
```

### Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required variables:
- `MONAD_RPC_URL`: Monad testnet RPC
- `PRIVATE_KEY`: Deployer private key
- `UNISWAP_V2_ROUTER`: Uniswap V2 Router address
- `UNISWAP_V2_FACTORY`: Uniswap V2 Factory address
- `SWITCHBOARD_ETH_USD_FEED`: ETH/USD Switchboard feed
- `SWITCHBOARD_USDC_USD_FEED`: USDC/USD Switchboard feed

## Testing

Run all tests:

```bash
forge test
```

Run tests with verbosity:

```bash
forge test -vvv
```

Run specific test:

```bash
forge test --match-test testVaultCreateStrategy
```

Gas report:

```bash
forge test --gas-report
```

## Deployment

### Deploy to Monad Testnet

```bash
forge script script/Deploy.s.sol \
  --rpc-url monad_testnet \
  --broadcast \
  --verify
```

The script will:
1. Deploy all implementations
2. Deploy all proxies
3. Initialize all contracts
4. Output deployment addresses

### Post-Deployment Configuration

1. Configure price feeds:
```solidity
oracle.setPriceFeed(WETH, SWITCHBOARD_ETH_USD_FEED);
oracle.setPriceFeed(USDC, SWITCHBOARD_USDC_USD_FEED);
```

2. Whitelist tokens:
```solidity
config.addWhitelistedToken(WETH);
config.addWhitelistedToken(USDC);
```

3. Create a strategy:
```solidity
address[] memory tokens = [WETH, USDC];
uint256[] memory weights = [60, 40]; // 60% WETH, 40% USDC
vault.createStrategy(tokens, weights, 3600); // 1 hour interval
```

4. Deposit tokens:
```solidity
WETH.approve(address(vault), amount);
vault.deposit(WETH, amount);
```

5. Set delegate (optional):
```solidity
vault.setDelegate(botAddress);
```

## Upgrading Contracts

Upgrade a specific contract:

```bash
forge script script/Upgrade.s.sol \
  --sig "upgradeVault()" \
  --rpc-url monad_testnet \
  --broadcast
```

Upgrade all contracts (use with caution):

```bash
forge script script/Upgrade.s.sol \
  --sig "upgradeAll()" \
  --rpc-url monad_testnet \
  --broadcast
```

## Usage

### Create a Strategy

```solidity
address[] memory tokens = new address[](2);
tokens[0] = WETH;
tokens[1] = USDC;

uint256[] memory weights = new uint256[](2);
weights[0] = 50; // 50%
weights[1] = 50; // 50%

vault.createStrategy(tokens, weights, 3600); // Rebalance every hour
```

### Execute Rebalance

```solidity
// As owner or delegate
vault.rebalance();
```

### Check if Rebalance Needed

```solidity
(bool shouldRebalance, uint256 drift) = vault.shouldRebalance();
```

## Configuration

### Default Values

- **Max Slippage**: 50 bps (0.5%)
- **Min Rebalance Interval**: 60 seconds
- **Max Allocation Drift**: 500 bps (5%)
- **Management Fee**: 50 bps (0.5% annual)
- **Performance Fee**: 1000 bps (10%)
- **Staleness Threshold**: 300 seconds (5 minutes)

### Modify Configuration

```solidity
config.setMaxSlippage(100); // 1%
config.setMinRebalanceInterval(3600); // 1 hour
config.setMaxAllocationDrift(1000); // 10%
```

## Security

### Implemented Security Features

✅ Access control (onlyOwner, onlyAuthorized)
✅ ReentrancyGuard on critical functions
✅ Input validation (non-zero addresses, array lengths)
✅ Price staleness checks
✅ Slippage protection
✅ Emergency pause mechanism
✅ Event emissions for all state changes
✅ UUPS upgradeability pattern

### Audits

⚠️ **Not audited** - This is a hackathon project. Use at your own risk.

## Testing Coverage

Current test coverage includes:
- ✅ Oracle price queries and validation
- ✅ Config parameter updates
- ✅ UniswapHelper swaps and quotes
- ✅ Vault strategy management
- ✅ Vault deposits/withdrawals
- ✅ Vault delegation
- ✅ Integration tests

## Project Structure

```
contract/
├── src/
│   ├── StrategyVault.sol          # Main vault logic
│   ├── SwitchboardOracle.sol      # Price oracle wrapper
│   ├── UniswapHelper.sol          # DEX interaction
│   ├── RebalancerConfig.sol       # Configuration
│   └── interfaces/                # Contract interfaces
├── script/
│   ├── Deploy.s.sol               # Deployment script
│   └── Upgrade.s.sol              # Upgrade script
├── test/
│   ├── RebasedSystem.t.sol        # Comprehensive tests
│   └── mocks/                     # Mock contracts
├── foundry.toml                   # Forge configuration
└── .env.example                   # Environment template
```

## Tech Stack

- **Solidity**: ^0.8.23
- **Framework**: Foundry (Forge + Anvil)
- **Oracle**: Switchboard (Monad testnet)
- **DEX**: Uniswap V2 (Monad testnet)
- **Upgradeable**: OpenZeppelin UUPS + Initializable

## Development

### Build

```bash
forge build
```

### Format

```bash
forge fmt
```

### Clean

```bash
forge clean
```

## Version Information

All contracts include version tracking:

```solidity
string public constant version = "1.0.0";

function getVersion() external pure returns (string memory) {
    return version;
}
```

## License

MIT

## Hackathon Notes

**KISS Principle**: Simple, readable, working code prioritized over optimization
**Test Coverage**: 20 tests passing, covering core functionality
**Deployment Ready**: Complete deployment and upgrade scripts
**Monad Ready**: Configured for Monad testnet deployment

---

Built for hackathon - prioritizing working code over perfection! 🚀

#!/bin/bash
# Complete Monad Deployment Script
# Deploys all contracts, configures oracle, updates all .env files automatically

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_section() { echo -e "${CYAN}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$1\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# Banner
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          MONAD TESTNET - COMPLETE DEPLOYMENT             ║
║                                                           ║
║  • Deploy all contracts                                   ║
║  • Configure Oracle (price feeds)                         ║
║  • Update all .env files                                  ║
║  • Verify everything                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
REPO_ROOT="/Users/kadzu/Documents/Repositories/rebased-monorepo"
CONTRACT_DIR="$REPO_ROOT/rebased/contract"
BACKEND_DIR="$REPO_ROOT/rebased/backend"
FRONTEND_DIR="$REPO_ROOT/rebased/frontend"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Monad configuration
RPC_URL="https://testnet-rpc.monad.xyz"
CHAIN_ID=10143
CHAIN_NAME="monad"

# Owner key (for deployment and oracle configuration)
OWNER_KEY="0x84879ffe9f0b582b956f4870f8b12b0481095a8f19383e0744f0ef293f7f89f4"

# External protocol addresses
PYTH_CONTRACT="0x2880aB155794e7179c9eE2e38200202908C17B43"
UNISWAP_V2_ROUTER="0xfb8e1c3b833f9e67a71c859a132cf783b645e436"
UNISWAP_V2_FACTORY="0x733e88f248b742db6c14c0b1713af5ad7fdd59d0"

# Token addresses (Monad testnet)
WETH="0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37"
USDC="0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"

# Pyth price feed IDs
ETH_USD_FEED="0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
USDC_USD_FEED="0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"

# ============================================================================
# PHASE 1: PRE-DEPLOYMENT CHECKS
# ============================================================================

print_section "PHASE 1: Pre-deployment Checks"

# Check if we're in the right directory
cd "$CONTRACT_DIR" || {
  print_error "Contract directory not found: $CONTRACT_DIR"
  exit 1
}
print_success "Working directory: $CONTRACT_DIR"

# Check Foundry is installed
if ! command -v forge &> /dev/null; then
  print_error "Foundry not installed. Install from: https://book.getfoundry.sh"
  exit 1
fi
print_success "Foundry found: $(forge --version | head -n1)"

# Check RPC connectivity
print_info "Testing Monad RPC connectivity..."
BLOCK_NUMBER=$(cast block-number --rpc-url $RPC_URL 2>&1)
if [ $? -ne 0 ]; then
  print_error "Cannot connect to Monad RPC: $RPC_URL"
  exit 1
fi
print_success "Monad RPC connected (block: $BLOCK_NUMBER)"

# ============================================================================
# PHASE 2: BACKUP CURRENT STATE
# ============================================================================

print_section "PHASE 2: Backup Current State"

# Backup contract deployment files
if [ -f "deployments-monad.json" ]; then
  cp deployments-monad.json "deployments-monad.json.backup-$TIMESTAMP"
  print_success "Backed up deployments-monad.json"
fi

# Backup backend .env
if [ -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.backup-$TIMESTAMP"
  print_success "Backed up backend/.env"
fi

# Backup frontend .env
if [ -f "$FRONTEND_DIR/.env" ]; then
  cp "$FRONTEND_DIR/.env" "$FRONTEND_DIR/.env.backup-$TIMESTAMP"
  print_success "Backed up frontend/.env"
fi

print_success "All backups created with timestamp: $TIMESTAMP"

# ============================================================================
# PHASE 3: DEPLOY CONTRACTS
# ============================================================================

print_section "PHASE 3: Deploy Contracts to Monad"

# Set environment for deployment
export CHAIN_NAME=$CHAIN_NAME
export PYTH_CONTRACT=$PYTH_CONTRACT
export UNISWAP_V2_ROUTER=$UNISWAP_V2_ROUTER
export UNISWAP_V2_FACTORY=$UNISWAP_V2_FACTORY
export PRIVATE_KEY=$OWNER_KEY

print_info "Deploying contracts (this may take 2-3 minutes)..."
print_info "  Chain: Monad Testnet ($CHAIN_ID)"
print_info "  Pyth: $PYTH_CONTRACT"
print_info "  Uniswap Router: $UNISWAP_V2_ROUTER"
print_info "  Uniswap Factory: $UNISWAP_V2_FACTORY"

# Deploy contracts
DEPLOY_LOG="/tmp/monad-deploy-$TIMESTAMP.log"
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_URL \
  --broadcast \
  --legacy \
  -vv \
  > "$DEPLOY_LOG" 2>&1

if [ $? -ne 0 ]; then
  print_error "Deployment failed. Check logs: $DEPLOY_LOG"
  cat "$DEPLOY_LOG"
  exit 1
fi

print_success "Deployment completed"

# Wait for file to be written
sleep 2

# Check if deployment JSON was created
if [ ! -f "deployments-monad.json" ]; then
  print_error "deployments-monad.json not created by deployment script"
  exit 1
fi

print_success "Deployment file created: deployments-monad.json"

# Parse addresses from JSON using jq or manual extraction
print_info "Parsing deployed contract addresses..."

# Use grep and awk to extract addresses (works without jq)
PYTH_ORACLE=$(grep '"pythOracle"' deployments-monad.json | awk -F'"' '{print $4}')
PYTH_ORACLE_IMPL=$(grep '"pythOracleImpl"' deployments-monad.json | awk -F'"' '{print $4}')
REBALANCER_CONFIG=$(grep '"rebalancerConfig"' deployments-monad.json | awk -F'"' '{print $4}')
REBALANCER_CONFIG_IMPL=$(grep '"rebalancerConfigImpl"' deployments-monad.json | awk -F'"' '{print $4}')
UNISWAP_HELPER=$(grep '"uniswapHelper"' deployments-monad.json | awk -F'"' '{print $4}')
UNISWAP_HELPER_IMPL=$(grep '"uniswapHelperImpl"' deployments-monad.json | awk -F'"' '{print $4}')
DELEGATION_MANAGER=$(grep '"delegationManager"' deployments-monad.json | awk -F'"' '{print $4}')
STRATEGY_REGISTRY=$(grep '"strategyRegistry"' deployments-monad.json | awk -F'"' '{print $4}')
STRATEGY_REGISTRY_IMPL=$(grep '"strategyRegistryImpl"' deployments-monad.json | awk -F'"' '{print $4}')
REBALANCE_EXECUTOR=$(grep '"rebalanceExecutor"' deployments-monad.json | awk -F'"' '{print $4}')
REBALANCE_EXECUTOR_IMPL=$(grep '"rebalanceExecutorImpl"' deployments-monad.json | awk -F'"' '{print $4}')

# Verify we got all addresses
if [ -z "$PYTH_ORACLE" ] || [ -z "$DELEGATION_MANAGER" ] || [ -z "$REBALANCE_EXECUTOR" ]; then
  print_error "Failed to parse contract addresses from JSON"
  exit 1
fi

print_success "All contract addresses extracted"

# Display addresses
echo
echo "Deployed Contracts:"
echo "  PythOracle:        $PYTH_ORACLE"
echo "  RebalancerConfig:  $REBALANCER_CONFIG"
echo "  UniswapHelper:     $UNISWAP_HELPER"
echo "  DelegationManager: $DELEGATION_MANAGER"
echo "  StrategyRegistry:  $STRATEGY_REGISTRY"
echo "  RebalanceExecutor: $REBALANCE_EXECUTOR"
echo

# ============================================================================
# PHASE 4: CONFIGURE ORACLE
# ============================================================================

print_section "PHASE 4: Configure Oracle (Price Feeds)"

print_info "Configuring WETH price feed (ETH/USD)..."
TX_HASH=$(cast send $PYTH_ORACLE \
  "setPriceFeed(address,bytes32)" \
  $WETH \
  $ETH_USD_FEED \
  --private-key $OWNER_KEY \
  --rpc-url $RPC_URL \
  --legacy \
  --gas-limit 500000 \
  2>&1 | grep "transactionHash" | awk '{print $2}')

if [ -z "$TX_HASH" ]; then
  print_error "Failed to set WETH price feed"
  exit 1
fi
print_success "WETH price feed configured (tx: ${TX_HASH:0:10}...)"
sleep 2

print_info "Configuring USDC price feed (USDC/USD)..."
TX_HASH=$(cast send $PYTH_ORACLE \
  "setPriceFeed(address,bytes32)" \
  $USDC \
  $USDC_USD_FEED \
  --private-key $OWNER_KEY \
  --rpc-url $RPC_URL \
  --legacy \
  --gas-limit 500000 \
  2>&1 | grep "transactionHash" | awk '{print $2}')

if [ -z "$TX_HASH" ]; then
  print_error "Failed to set USDC price feed"
  exit 1
fi
print_success "USDC price feed configured (tx: ${TX_HASH:0:10}...)"
sleep 2

print_info "Setting max price age to 1 hour (testnet)..."
TX_HASH=$(cast send $PYTH_ORACLE \
  "setMaxPriceAge(uint256)" \
  3600 \
  --private-key $OWNER_KEY \
  --rpc-url $RPC_URL \
  --legacy \
  2>&1 | grep "transactionHash" | awk '{print $2}')

if [ -z "$TX_HASH" ]; then
  print_error "Failed to set max price age"
  exit 1
fi
print_success "Max price age set to 3600 seconds"
sleep 2

print_info "Marking USDC as stablecoin..."
TX_HASH=$(cast send $PYTH_ORACLE \
  "setStablecoin(address,bool)" \
  $USDC \
  true \
  --private-key $OWNER_KEY \
  --rpc-url $RPC_URL \
  --legacy \
  2>&1 | grep "transactionHash" | awk '{print $2}')

if [ -z "$TX_HASH" ]; then
  print_error "Failed to mark USDC as stablecoin"
  exit 1
fi
print_success "USDC marked as stablecoin"

print_success "Oracle configuration complete"

# ============================================================================
# PHASE 5: VERIFY ORACLE SETUP
# ============================================================================

print_section "PHASE 5: Verify Oracle Setup"

print_info "Testing WETH price fetch..."
WETH_PRICE=$(cast call $PYTH_ORACLE "getPrice(address)(uint256)" $WETH --rpc-url $RPC_URL 2>&1)
if [ $? -eq 0 ]; then
  print_success "WETH price: $WETH_PRICE"
else
  print_warning "WETH price fetch failed (may need Pyth update)"
fi

print_info "Testing USDC price fetch..."
USDC_PRICE=$(cast call $PYTH_ORACLE "getPrice(address)(uint256)" $USDC --rpc-url $RPC_URL 2>&1)
if [ $? -eq 0 ]; then
  print_success "USDC price: $USDC_PRICE"
else
  print_warning "USDC price fetch failed (may need Pyth update)"
fi

# ============================================================================
# PHASE 6: UPDATE BACKEND .ENV
# ============================================================================

print_section "PHASE 6: Update Backend .env"

cd "$BACKEND_DIR"

# Update Monad addresses using perl (works on macOS)
perl -pi -e "s/MONAD_REGISTRY=.*/MONAD_REGISTRY=$STRATEGY_REGISTRY/" .env
perl -pi -e "s/MONAD_EXECUTOR=.*/MONAD_EXECUTOR=$REBALANCE_EXECUTOR/" .env
perl -pi -e "s/MONAD_ORACLE=.*/MONAD_ORACLE=$PYTH_ORACLE/" .env
perl -pi -e "s/MONAD_UNISWAP_HELPER=.*/MONAD_UNISWAP_HELPER=$UNISWAP_HELPER/" .env
perl -pi -e "s/MONAD_CONFIG=.*/MONAD_CONFIG=$REBALANCER_CONFIG/" .env
perl -pi -e "s/MONAD_DELEGATION_MANAGER=.*/MONAD_DELEGATION_MANAGER=$DELEGATION_MANAGER/" .env

# Update deployment comment
TODAY=$(date +%Y-%m-%d)
perl -pi -e "s/# Contract addresses.*/# Contract addresses (REDEPLOYED $TODAY - Clean Deployment)/" .env

print_success "Backend .env updated with new Monad addresses"

# Update .env.example (sync with .env but keep sensitive data as placeholders)
perl -pi -e "s/MONAD_REGISTRY=.*/MONAD_REGISTRY=$STRATEGY_REGISTRY/" .env.example
perl -pi -e "s/MONAD_EXECUTOR=.*/MONAD_EXECUTOR=$REBALANCE_EXECUTOR/" .env.example
perl -pi -e "s/MONAD_ORACLE=.*/MONAD_ORACLE=$PYTH_ORACLE/" .env.example
perl -pi -e "s/MONAD_UNISWAP_HELPER=.*/MONAD_UNISWAP_HELPER=$UNISWAP_HELPER/" .env.example
perl -pi -e "s/MONAD_CONFIG=.*/MONAD_CONFIG=$REBALANCER_CONFIG/" .env.example
perl -pi -e "s/MONAD_DELEGATION_MANAGER=.*/MONAD_DELEGATION_MANAGER=$DELEGATION_MANAGER/" .env.example
perl -pi -e "s/# Contract addresses.*/# Contract addresses (REDEPLOYED $TODAY - Clean Deployment)/" .env.example

print_success "Backend .env.example updated"

# ============================================================================
# PHASE 7: UPDATE FRONTEND .ENV
# ============================================================================

print_section "PHASE 7: Update Frontend .env"

cd "$FRONTEND_DIR"

# Update Monad addresses
perl -pi -e "s/VITE_MONAD_DELEGATION_MANAGER=.*/VITE_MONAD_DELEGATION_MANAGER=$DELEGATION_MANAGER/" .env
perl -pi -e "s/VITE_MONAD_STRATEGY_REGISTRY=.*/VITE_MONAD_STRATEGY_REGISTRY=$STRATEGY_REGISTRY/" .env

# Update comment
perl -pi -e "s/# Contract Addresses.*/# Contract Addresses - Deployed $TODAY (Clean Redeployment)/" .env

print_success "Frontend .env updated with new Monad addresses"

# ============================================================================
# PHASE 8: CREATE CONTRACT .ENV
# ============================================================================

print_section "PHASE 8: Create Contract .env"

cd "$CONTRACT_DIR"

cat > .env << EOF
# Monad Testnet Configuration
MONAD_RPC_URL=$RPC_URL
CHAIN_NAME=$CHAIN_NAME

# Deployment Key (Owner)
PRIVATE_KEY=$OWNER_KEY

# External Protocol Addresses
PYTH_CONTRACT=$PYTH_CONTRACT
UNISWAP_V2_ROUTER=$UNISWAP_V2_ROUTER
UNISWAP_V2_FACTORY=$UNISWAP_V2_FACTORY

# Deployed Contract Addresses (Auto-updated: $TODAY)
PYTH_ORACLE=$PYTH_ORACLE
PYTH_ORACLE_IMPL=$PYTH_ORACLE_IMPL
REBALANCER_CONFIG=$REBALANCER_CONFIG
REBALANCER_CONFIG_IMPL=$REBALANCER_CONFIG_IMPL
UNISWAP_HELPER=$UNISWAP_HELPER
UNISWAP_HELPER_IMPL=$UNISWAP_HELPER_IMPL
DELEGATION_MANAGER=$DELEGATION_MANAGER
STRATEGY_REGISTRY=$STRATEGY_REGISTRY
STRATEGY_REGISTRY_IMPL=$STRATEGY_REGISTRY_IMPL
REBALANCE_EXECUTOR=$REBALANCE_EXECUTOR
REBALANCE_EXECUTOR_IMPL=$REBALANCE_EXECUTOR_IMPL

# Token Addresses (Monad Testnet)
WETH=$WETH
USDC=$USDC

# Verification
MONAD_EXPLORER_API_KEY=
EOF

print_success "Contract .env created"

# ============================================================================
# PHASE 9: VERIFY DEPLOYMENTS ON-CHAIN
# ============================================================================

print_section "PHASE 9: Verify Contracts On-Chain"

print_info "Checking deployed contract code..."

# Check key contracts have code
for name in "DelegationManager" "RebalanceExecutor" "StrategyRegistry" "PythOracle"; do
  case $name in
    "DelegationManager") addr=$DELEGATION_MANAGER ;;
    "RebalanceExecutor") addr=$REBALANCE_EXECUTOR ;;
    "StrategyRegistry") addr=$STRATEGY_REGISTRY ;;
    "PythOracle") addr=$PYTH_ORACLE ;;
  esac

  code=$(cast code "$addr" --rpc-url $RPC_URL)
  if [ "$code" == "0x" ]; then
    print_error "No code at $name: $addr"
    exit 1
  fi
  print_success "$name verified: $addr"
done

# ============================================================================
# PHASE 10: GENERATE DEPLOYMENT REPORT
# ============================================================================

print_section "PHASE 10: Deployment Report"

REPORT_FILE="/tmp/monad-deployment-report-$TIMESTAMP.txt"

cat > "$REPORT_FILE" << EOF
╔═══════════════════════════════════════════════════════════╗
║        MONAD DEPLOYMENT REPORT                             ║
╚═══════════════════════════════════════════════════════════╝

Deployment Timestamp: $(date)
Chain: Monad Testnet (ID: $CHAIN_ID)
RPC: $RPC_URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOYED CONTRACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Core Contracts (Proxies):
  DelegationManager:   $DELEGATION_MANAGER
  StrategyRegistry:    $STRATEGY_REGISTRY
  RebalanceExecutor:   $REBALANCE_EXECUTOR
  PythOracle:          $PYTH_ORACLE
  UniswapHelper:       $UNISWAP_HELPER
  RebalancerConfig:    $REBALANCER_CONFIG

Implementations:
  PythOracle Impl:           $PYTH_ORACLE_IMPL
  RebalancerConfig Impl:     $REBALANCER_CONFIG_IMPL
  UniswapHelper Impl:        $UNISWAP_HELPER_IMPL
  StrategyRegistry Impl:     $STRATEGY_REGISTRY_IMPL
  RebalanceExecutor Impl:    $REBALANCE_EXECUTOR_IMPL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORACLE CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Price Feeds Configured:
  WETH ($WETH):
    → ETH/USD: $ETH_USD_FEED

  USDC ($USDC):
    → USDC/USD: $USDC_USD_FEED
    → Stablecoin: YES

Oracle Parameters:
  Max Price Age: 3600 seconds (1 hour)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILES UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ $CONTRACT_DIR/deployments-monad.json
  ✅ $CONTRACT_DIR/.env (CREATED)
  ✅ $BACKEND_DIR/.env
  ✅ $BACKEND_DIR/.env.example
  ✅ $FRONTEND_DIR/.env

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKUPS CREATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

# List backups
if [ -f "$CONTRACT_DIR/deployments-monad.json.backup-$TIMESTAMP" ]; then
  echo "  $CONTRACT_DIR/deployments-monad.json.backup-$TIMESTAMP" >> "$REPORT_FILE"
fi
if [ -f "$BACKEND_DIR/.env.backup-$TIMESTAMP" ]; then
  echo "  $BACKEND_DIR/.env.backup-$TIMESTAMP" >> "$REPORT_FILE"
fi
if [ -f "$FRONTEND_DIR/.env.backup-$TIMESTAMP" ]; then
  echo "  $FRONTEND_DIR/.env.backup-$TIMESTAMP" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Clean up database (delete old delegations):
   cd $BACKEND_DIR
   PGPASSWORD=postgres psql -U postgres -d rebased -c "DELETE FROM delegations; DELETE FROM strategies;"

2. Restart backend bot:
   cd $BACKEND_DIR
   bun run start:dev

3. Create new delegation via frontend:
   cd $FRONTEND_DIR
   npm run dev
   → Open http://localhost:5173

4. Test delegation debugging:
   - Set DEBUG_DELEGATION_LEVEL=1 in backend/.env
   - Restart bot and watch logs
   - Progressively increase level (2→3→4→5)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USEFUL COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check WETH price:
  cast call $PYTH_ORACLE "getPrice(address)(uint256)" $WETH --rpc-url $RPC_URL

Check USDC price:
  cast call $PYTH_ORACLE "getPrice(address)(uint256)" $USDC --rpc-url $RPC_URL

Verify oracle config:
  cd $BACKEND_DIR
  ./scripts/verify-oracle-config.sh monad

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOYMENT LOGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Deployment: $DEPLOY_LOG
  Report: $REPORT_FILE

╔═══════════════════════════════════════════════════════════╗
║          DEPLOYMENT COMPLETED SUCCESSFULLY ✅              ║
╚═══════════════════════════════════════════════════════════╝
EOF

cat "$REPORT_FILE"

print_success "Deployment report saved to: $REPORT_FILE"

echo
print_success "🎉 Monad deployment complete!"
print_info "📋 Review the report above for next steps"
echo

exit 0

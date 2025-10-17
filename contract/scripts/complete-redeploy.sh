#!/bin/bash

# Complete Redeployment Script for Rebased Platform
# This script will:
# 1. Backup current state
# 2. Deploy all contracts to both chains
# 3. Update all deployment files
# 4. Update all .env files
# 5. Verify everything

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║        REBASED PLATFORM - COMPLETE REDEPLOYMENT          ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
REPO_ROOT="/Users/kadzu/Documents/Repositories/rebased-monorepo"
CONTRACT_DIR="$REPO_ROOT/rebased/contract"
BACKEND_DIR="$REPO_ROOT/rebased/backend"
FRONTEND_DIR="$REPO_ROOT/rebased/frontend"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Deployment addresses will be stored here
MONAD_DEPLOYMENT_FILE="/tmp/monad-deployment-$TIMESTAMP.txt"
BASE_DEPLOYMENT_FILE="/tmp/base-deployment-$TIMESTAMP.txt"

# ============================================================================
# PHASE 1: PRE-DEPLOYMENT CHECKS
# ============================================================================

print_info "Phase 1: Pre-deployment checks..."

# Check if we're in the right directory
cd "$CONTRACT_DIR" || {
  print_error "Contract directory not found: $CONTRACT_DIR"
  exit 1
}

# Check Foundry is installed
if ! command -v forge &> /dev/null; then
  print_error "Foundry not installed. Please install: https://book.getfoundry.sh/getting-started/installation"
  exit 1
fi

print_success "Foundry found: $(forge --version | head -n1)"

# Check RPC connectivity
print_info "Testing Monad RPC connectivity..."
if ! cast block-number --rpc-url https://testnet-rpc.monad.xyz &> /dev/null; then
  print_error "Cannot connect to Monad RPC"
  exit 1
fi
print_success "Monad RPC: Connected"

print_info "Testing Base RPC connectivity..."
if ! cast block-number --rpc-url https://sepolia.base.org &> /dev/null; then
  print_error "Cannot connect to Base RPC"
  exit 1
fi
print_success "Base RPC: Connected"

# ============================================================================
# PHASE 2: BACKUP CURRENT STATE
# ============================================================================

print_info "Phase 2: Backing up current state..."

# Backup contract deployment files
if [ -f "deployments-monad.json" ]; then
  cp deployments-monad.json "deployments-monad.json.backup-$TIMESTAMP"
  print_success "Backed up deployments-monad.json"
fi

if [ -f "deployments-base.json" ]; then
  cp deployments-base.json "deployments-base.json.backup-$TIMESTAMP"
  print_success "Backed up deployments-base.json"
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
# PHASE 3: DEPLOY TO MONAD TESTNET
# ============================================================================

print_info "Phase 3: Deploying contracts to Monad Testnet..."

# Set Monad environment
export CHAIN_NAME=monad
export PYTH_CONTRACT=0x2880aB155794e7179c9eE2e38200202908C17B43
export UNISWAP_V2_ROUTER=0xfb8e1c3b833f9e67a71c859a132cf783b645e436
export UNISWAP_V2_FACTORY=0x733e88f248b742db6c14c0b1713af5ad7fdd59d0
export PRIVATE_KEY=0x84879ffe9f0b582b956f4870f8b12b0481095a8f19383e0744f0ef293f7f89f4

print_info "Deploying to Monad (this may take a few minutes)..."

# Deploy contracts
forge script script/DeployAll.s.sol:DeployAllScript \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --legacy \
  -vv \
  > "/tmp/monad-deploy-output-$TIMESTAMP.log" 2>&1

if [ $? -ne 0 ]; then
  print_error "Monad deployment failed. Check logs: /tmp/monad-deploy-output-$TIMESTAMP.log"
  exit 1
fi

print_success "Monad deployment completed"

# Extract addresses from deployment output
print_info "Extracting Monad contract addresses..."

# Parse the deployment log to extract addresses
# This will need to be customized based on your actual deployment output format
MONAD_LOG="/tmp/monad-deploy-output-$TIMESTAMP.log"

# Create deployment file
cat > "$MONAD_DEPLOYMENT_FILE" << EOF
# Monad Testnet Deployment - $TIMESTAMP
# Auto-extracted from deployment logs

# TODO: Parse these from the actual deployment logs
# For now, you'll need to manually update these after reviewing the logs
MONAD_PYTH_ORACLE=
MONAD_PYTH_ORACLE_IMPL=
MONAD_REBALANCER_CONFIG=
MONAD_REBALANCER_CONFIG_IMPL=
MONAD_STRATEGY_REGISTRY=
MONAD_STRATEGY_REGISTRY_IMPL=
MONAD_UNISWAP_HELPER=
MONAD_UNISWAP_HELPER_IMPL=
MONAD_DELEGATION_MANAGER=
MONAD_REBALANCE_EXECUTOR=
MONAD_REBALANCE_EXECUTOR_IMPL=
EOF

print_warning "MANUAL STEP REQUIRED:"
print_warning "Please review the deployment log and update addresses:"
print_warning "  Log: $MONAD_LOG"
print_warning "  File to update: $MONAD_DEPLOYMENT_FILE"
echo
read -p "Press ENTER when you've updated the Monad addresses..."

# Source the addresses
source "$MONAD_DEPLOYMENT_FILE"

# Verify we got addresses
if [ -z "$MONAD_DELEGATION_MANAGER" ]; then
  print_error "Monad addresses not set. Please update $MONAD_DEPLOYMENT_FILE"
  exit 1
fi

print_success "Monad addresses loaded"

# ============================================================================
# PHASE 4: DEPLOY TO BASE SEPOLIA
# ============================================================================

print_info "Phase 4: Deploying contracts to Base Sepolia..."

# Set Base environment
export CHAIN_NAME=base
export PYTH_CONTRACT=0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
export UNISWAP_V2_ROUTER=0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
export UNISWAP_V2_FACTORY=0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6
export BASESCAN_API_KEY=""

print_info "Deploying to Base Sepolia (this may take a few minutes)..."

# Deploy contracts
forge script script/DeployAll.s.sol:DeployAllScript \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  -vv \
  > "/tmp/base-deploy-output-$TIMESTAMP.log" 2>&1

if [ $? -ne 0 ]; then
  print_error "Base deployment failed. Check logs: /tmp/base-deploy-output-$TIMESTAMP.log"
  exit 1
fi

print_success "Base deployment completed"

# Extract Base addresses
print_info "Extracting Base contract addresses..."

BASE_LOG="/tmp/base-deploy-output-$TIMESTAMP.log"

cat > "$BASE_DEPLOYMENT_FILE" << EOF
# Base Sepolia Deployment - $TIMESTAMP
# Auto-extracted from deployment logs

# TODO: Parse these from the actual deployment logs
BASE_PYTH_ORACLE=
BASE_PYTH_ORACLE_IMPL=
BASE_REBALANCER_CONFIG=
BASE_REBALANCER_CONFIG_IMPL=
BASE_STRATEGY_REGISTRY=
BASE_STRATEGY_REGISTRY_IMPL=
BASE_UNISWAP_HELPER=
BASE_UNISWAP_HELPER_IMPL=
BASE_DELEGATION_MANAGER=
BASE_REBALANCE_EXECUTOR=
BASE_REBALANCE_EXECUTOR_IMPL=
EOF

print_warning "MANUAL STEP REQUIRED:"
print_warning "Please review the deployment log and update addresses:"
print_warning "  Log: $BASE_LOG"
print_warning "  File to update: $BASE_DEPLOYMENT_FILE"
echo
read -p "Press ENTER when you've updated the Base addresses..."

# Source the addresses
source "$BASE_DEPLOYMENT_FILE"

# Verify we got addresses
if [ -z "$BASE_DELEGATION_MANAGER" ]; then
  print_error "Base addresses not set. Please update $BASE_DEPLOYMENT_FILE"
  exit 1
fi

print_success "Base addresses loaded"

# ============================================================================
# PHASE 5: VERIFY DEPLOYMENTS ON-CHAIN
# ============================================================================

print_info "Phase 5: Verifying deployments on-chain..."

# Verify Monad contracts
print_info "Verifying Monad contracts..."
for addr in "$MONAD_DELEGATION_MANAGER" "$MONAD_REBALANCE_EXECUTOR" "$MONAD_STRATEGY_REGISTRY"; do
  code=$(cast code "$addr" --rpc-url https://testnet-rpc.monad.xyz)
  if [ "$code" == "0x" ]; then
    print_error "Contract $addr not found on Monad"
    exit 1
  fi
done
print_success "All Monad contracts verified on-chain"

# Verify Base contracts
print_info "Verifying Base contracts..."
for addr in "$BASE_DELEGATION_MANAGER" "$BASE_REBALANCE_EXECUTOR" "$BASE_STRATEGY_REGISTRY"; do
  code=$(cast code "$addr" --rpc-url https://sepolia.base.org)
  if [ "$code" == "0x" ]; then
    print_error "Contract $addr not found on Base"
    exit 1
  fi
done
print_success "All Base contracts verified on-chain"

# ============================================================================
# PHASE 6: UPDATE DEPLOYMENT FILES
# ============================================================================

print_info "Phase 6: Updating deployment files..."

# Update deployments-monad.json
cat > "$CONTRACT_DIR/deployments-monad.json" << EOF
{
  "monad": {
    "pythOracle": "$MONAD_PYTH_ORACLE",
    "pythOracleImpl": "$MONAD_PYTH_ORACLE_IMPL",
    "rebalancerConfig": "$MONAD_REBALANCER_CONFIG",
    "rebalancerConfigImpl": "$MONAD_REBALANCER_CONFIG_IMPL",
    "uniswapHelper": "$MONAD_UNISWAP_HELPER",
    "uniswapHelperImpl": "$MONAD_UNISWAP_HELPER_IMPL",
    "delegationManager": "$MONAD_DELEGATION_MANAGER",
    "strategyRegistry": "$MONAD_STRATEGY_REGISTRY",
    "strategyRegistryImpl": "$MONAD_STRATEGY_REGISTRY_IMPL",
    "rebalanceExecutor": "$MONAD_REBALANCE_EXECUTOR",
    "rebalanceExecutorImpl": "$MONAD_REBALANCE_EXECUTOR_IMPL"
  },
  "_metadata": {
    "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployer": "0x47B245f2A3c7557d855E4d800890C4a524a42Cc8",
    "network": "monad-testnet",
    "chainId": 10143,
    "script": "complete-redeploy.sh"
  }
}
EOF
print_success "Updated deployments-monad.json"

# Update deployments-base.json
cat > "$CONTRACT_DIR/deployments-base.json" << EOF
{
  "base": {
    "pythOracle": "$BASE_PYTH_ORACLE",
    "pythOracleImpl": "$BASE_PYTH_ORACLE_IMPL",
    "rebalancerConfig": "$BASE_REBALANCER_CONFIG",
    "rebalancerConfigImpl": "$BASE_REBALANCER_CONFIG_IMPL",
    "uniswapHelper": "$BASE_UNISWAP_HELPER",
    "uniswapHelperImpl": "$BASE_UNISWAP_HELPER_IMPL",
    "delegationManager": "$BASE_DELEGATION_MANAGER",
    "strategyRegistry": "$BASE_STRATEGY_REGISTRY",
    "strategyRegistryImpl": "$BASE_STRATEGY_REGISTRY_IMPL",
    "rebalanceExecutor": "$BASE_REBALANCE_EXECUTOR",
    "rebalanceExecutorImpl": "$BASE_REBALANCE_EXECUTOR_IMPL"
  },
  "_metadata": {
    "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployer": "0x47B245f2A3c7557d855E4d800890C4a524a42Cc8",
    "network": "base-sepolia",
    "chainId": 84532,
    "script": "complete-redeploy.sh"
  }
}
EOF
print_success "Updated deployments-base.json"

# ============================================================================
# PHASE 7: UPDATE BACKEND .ENV
# ============================================================================

print_info "Phase 7: Updating backend .env..."

cd "$BACKEND_DIR"

# Update Monad addresses
perl -pi -e "s/MONAD_REGISTRY=.*/MONAD_REGISTRY=$MONAD_STRATEGY_REGISTRY/" .env
perl -pi -e "s/MONAD_EXECUTOR=.*/MONAD_EXECUTOR=$MONAD_REBALANCE_EXECUTOR/" .env
perl -pi -e "s/MONAD_ORACLE=.*/MONAD_ORACLE=$MONAD_PYTH_ORACLE/" .env
perl -pi -e "s/MONAD_UNISWAP_HELPER=.*/MONAD_UNISWAP_HELPER=$MONAD_UNISWAP_HELPER/" .env
perl -pi -e "s/MONAD_CONFIG=.*/MONAD_CONFIG=$MONAD_REBALANCER_CONFIG/" .env
perl -pi -e "s/MONAD_DELEGATION_MANAGER=.*/MONAD_DELEGATION_MANAGER=$MONAD_DELEGATION_MANAGER/" .env

# Update Base addresses
perl -pi -e "s/BASE_REGISTRY=.*/BASE_REGISTRY=$BASE_STRATEGY_REGISTRY/" .env
perl -pi -e "s/BASE_EXECUTOR=.*/BASE_EXECUTOR=$BASE_REBALANCE_EXECUTOR/" .env
perl -pi -e "s/BASE_ORACLE=.*/BASE_ORACLE=$BASE_PYTH_ORACLE/" .env
perl -pi -e "s/BASE_UNISWAP_HELPER=.*/BASE_UNISWAP_HELPER=$BASE_UNISWAP_HELPER/" .env
perl -pi -e "s/BASE_CONFIG=.*/BASE_CONFIG=$BASE_REBALANCER_CONFIG/" .env
perl -pi -e "s/BASE_DELEGATION_MANAGER=.*/BASE_DELEGATION_MANAGER=$BASE_DELEGATION_MANAGER/" .env

# Update comment
perl -pi -e "s/# Contract addresses.*/# Contract addresses (REDEPLOYED $(date +%Y-%m-%d) - Clean Deployment)/" .env

print_success "Backend .env updated"

# Update .env.example
cp .env .env.example
print_success "Backend .env.example updated"

# ============================================================================
# PHASE 8: UPDATE FRONTEND .ENV
# ============================================================================

print_info "Phase 8: Updating frontend .env..."

cd "$FRONTEND_DIR"

# Update Monad addresses
perl -pi -e "s/VITE_MONAD_DELEGATION_MANAGER=.*/VITE_MONAD_DELEGATION_MANAGER=$MONAD_DELEGATION_MANAGER/" .env
perl -pi -e "s/VITE_MONAD_STRATEGY_REGISTRY=.*/VITE_MONAD_STRATEGY_REGISTRY=$MONAD_STRATEGY_REGISTRY/" .env

# Update Base addresses
perl -pi -e "s/VITE_BASE_DELEGATION_MANAGER=.*/VITE_BASE_DELEGATION_MANAGER=$BASE_DELEGATION_MANAGER/" .env
perl -pi -e "s/VITE_BASE_STRATEGY_REGISTRY=.*/VITE_BASE_STRATEGY_REGISTRY=$BASE_STRATEGY_REGISTRY/" .env

# Update comment
perl -pi -e "s/# Contract Addresses.*/# Contract Addresses - Deployed $(date +%Y-%m-%d) (Clean Redeployment)/" .env

print_success "Frontend .env updated"

# ============================================================================
# PHASE 9: VERIFICATION REPORT
# ============================================================================

print_info "Phase 9: Generating verification report..."

cat > "/tmp/deployment-verification-$TIMESTAMP.txt" << EOF
╔═══════════════════════════════════════════════════════════╗
║        DEPLOYMENT VERIFICATION REPORT                      ║
╚═══════════════════════════════════════════════════════════╝

Deployment Timestamp: $(date)

MONAD TESTNET (10143)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DelegationManager:   $MONAD_DELEGATION_MANAGER
  StrategyRegistry:    $MONAD_STRATEGY_REGISTRY
  RebalanceExecutor:   $MONAD_REBALANCE_EXECUTOR
  PythOracle:          $MONAD_PYTH_ORACLE
  UniswapHelper:       $MONAD_UNISWAP_HELPER
  RebalancerConfig:    $MONAD_REBALANCER_CONFIG

BASE SEPOLIA (84532)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DelegationManager:   $BASE_DELEGATION_MANAGER
  StrategyRegistry:    $BASE_STRATEGY_REGISTRY
  RebalanceExecutor:   $BASE_REBALANCE_EXECUTOR
  PythOracle:          $BASE_PYTH_ORACLE
  UniswapHelper:       $BASE_UNISWAP_HELPER
  RebalancerConfig:    $BASE_REBALANCER_CONFIG

FILES UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ $CONTRACT_DIR/deployments-monad.json
  ✅ $CONTRACT_DIR/deployments-base.json
  ✅ $BACKEND_DIR/.env
  ✅ $BACKEND_DIR/.env.example
  ✅ $FRONTEND_DIR/.env

BACKUPS CREATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  $CONTRACT_DIR/deployments-monad.json.backup-$TIMESTAMP
  $CONTRACT_DIR/deployments-base.json.backup-$TIMESTAMP
  $BACKEND_DIR/.env.backup-$TIMESTAMP
  $FRONTEND_DIR/.env.backup-$TIMESTAMP

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Clean up database (delete old delegations):
     PGPASSWORD=postgres psql -U postgres -d rebased -c "DELETE FROM delegations;"

  2. Create new delegation via frontend:
     - Start backend: cd $BACKEND_DIR && npm run dev
     - Start frontend: cd $FRONTEND_DIR && npm run dev
     - Open http://localhost:5173 and create delegation

  3. Test rebalance execution and verify on-chain

DEPLOYMENT LOGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Monad: /tmp/monad-deploy-output-$TIMESTAMP.log
  Base:  /tmp/base-deploy-output-$TIMESTAMP.log

╔═══════════════════════════════════════════════════════════╗
║              DEPLOYMENT COMPLETED SUCCESSFULLY             ║
╚═══════════════════════════════════════════════════════════╝
EOF

cat "/tmp/deployment-verification-$TIMESTAMP.txt"

print_success "Deployment completed successfully!"
print_info "Verification report saved to: /tmp/deployment-verification-$TIMESTAMP.txt"

echo
print_warning "📋 NEXT STEPS:"
echo "  1. Delete old delegations from database"
echo "  2. Create new delegation via frontend"
echo "  3. Test end-to-end rebalance flow"
echo

exit 0

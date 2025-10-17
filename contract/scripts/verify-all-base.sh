#!/bin/bash

# ========================================
# VERIFY ALL CONTRACTS ON BASE SEPOLIA
# ========================================
# Automatically verifies all 6 contracts (5 implementations + 1 DelegationManager)
# Reads addresses from deployments-base.json

set -e  # Exit on error

echo "========================================"
echo "BASE SEPOLIA - VERIFY ALL CONTRACTS"
echo "========================================"
echo ""

# Check if deployments file exists
if [ ! -f "deployments-base.json" ]; then
    echo "❌ Error: deployments-base.json not found"
    echo "Please run deployment first"
    exit 1
fi

# Parse JSON and extract addresses
PYTH_ORACLE_IMPL=$(jq -r '.base.pythOracleImpl' deployments-base.json)
REBALANCER_CONFIG_IMPL=$(jq -r '.base.rebalancerConfigImpl' deployments-base.json)
UNISWAP_HELPER_IMPL=$(jq -r '.base.uniswapHelperImpl' deployments-base.json)
STRATEGY_REGISTRY_IMPL=$(jq -r '.base.strategyRegistryImpl' deployments-base.json)
REBALANCE_EXECUTOR_IMPL=$(jq -r '.base.rebalanceExecutorImpl' deployments-base.json)

DELEGATION_MANAGER=$(jq -r '.base.delegationManager' deployments-base.json)

# Verification settings
RPC_URL="https://sepolia.base.org"
VERIFIER="blockscout"
VERIFIER_URL="https://base-sepolia.blockscout.com/api/"

echo "📋 Found 6 contracts to verify"
echo ""
echo "=== UUPS IMPLEMENTATIONS (5) ==="
echo "PythOracle: $PYTH_ORACLE_IMPL"
echo "RebalancerConfig: $REBALANCER_CONFIG_IMPL"
echo "UniswapHelper: $UNISWAP_HELPER_IMPL"
echo "StrategyRegistry: $STRATEGY_REGISTRY_IMPL"
echo "RebalanceExecutor: $REBALANCE_EXECUTOR_IMPL"
echo ""
echo "=== REGULAR CONTRACTS (1) ==="
echo "DelegationManager: $DELEGATION_MANAGER"
echo "Note: Using MetaMask's built-in caveat enforcers (no custom enforcers)"
echo ""
echo "========================================"
echo "Starting verification process..."
echo "========================================"
echo ""

# Counter for progress
VERIFIED=0
FAILED=0

# Function to verify a contract
verify_contract() {
    local NAME=$1
    local ADDRESS=$2
    local CONTRACT_PATH=$3

    echo "[$((VERIFIED + FAILED + 1))/6] Verifying $NAME..."

    if forge verify-contract \
        --rpc-url "$RPC_URL" \
        --verifier "$VERIFIER" \
        --verifier-url "$VERIFIER_URL" \
        "$ADDRESS" \
        "$CONTRACT_PATH" > /dev/null 2>&1; then
        echo "✅ $NAME verified successfully"
        ((VERIFIED++))
    else
        echo "⚠️  $NAME verification failed (might already be verified)"
        ((FAILED++))
    fi
    echo ""
}

# Verify UUPS Implementations
echo "=== VERIFYING UUPS IMPLEMENTATIONS ==="
echo ""
verify_contract "PythOracle" "$PYTH_ORACLE_IMPL" "src/PythOracle.sol:PythOracle"
verify_contract "RebalancerConfig" "$REBALANCER_CONFIG_IMPL" "src/RebalancerConfig.sol:RebalancerConfig"
verify_contract "UniswapHelper" "$UNISWAP_HELPER_IMPL" "src/UniswapHelper.sol:UniswapHelper"
verify_contract "StrategyRegistry" "$STRATEGY_REGISTRY_IMPL" "src/StrategyRegistry.sol:StrategyRegistry"
verify_contract "RebalanceExecutor" "$REBALANCE_EXECUTOR_IMPL" "src/RebalanceExecutor.sol:RebalanceExecutor"

# Verify Regular Contracts
echo "=== VERIFYING REGULAR CONTRACTS ==="
echo ""
verify_contract "DelegationManager" "$DELEGATION_MANAGER" "@delegation-framework/DelegationManager.sol:DelegationManager"

echo "========================================"
echo "VERIFICATION COMPLETE"
echo "========================================"
echo ""
echo "✅ Successfully verified: $VERIFIED"
echo "⚠️  Failed/Already verified: $FAILED"
echo ""
echo "🔍 Check contracts on explorer:"
echo "https://base-sepolia.blockscout.com"
echo ""

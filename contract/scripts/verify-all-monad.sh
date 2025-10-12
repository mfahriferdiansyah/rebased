#!/bin/bash

# ========================================
# VERIFY ALL CONTRACTS ON MONAD TESTNET
# ========================================
# Automatically verifies all 11 contracts (5 implementations + 6 regular)
# Reads addresses from deployments-monad.json

set -e  # Exit on error

echo "========================================"
echo "MONAD TESTNET - VERIFY ALL CONTRACTS"
echo "========================================"
echo ""

# Check if deployments file exists
if [ ! -f "deployments-monad.json" ]; then
    echo "❌ Error: deployments-monad.json not found"
    echo "Please run deployment first"
    exit 1
fi

# Parse JSON and extract addresses
PYTH_ORACLE_IMPL=$(jq -r '.monad.pythOracleImpl' deployments-monad.json)
REBALANCER_CONFIG_IMPL=$(jq -r '.monad.rebalancerConfigImpl' deployments-monad.json)
UNISWAP_HELPER_IMPL=$(jq -r '.monad.uniswapHelperImpl' deployments-monad.json)
STRATEGY_REGISTRY_IMPL=$(jq -r '.monad.strategyRegistryImpl' deployments-monad.json)
REBALANCE_EXECUTOR_IMPL=$(jq -r '.monad.rebalanceExecutorImpl' deployments-monad.json)

DELEGATION_MANAGER=$(jq -r '.monad.delegationManager' deployments-monad.json)
ALLOWED_TARGETS_ENFORCER=$(jq -r '.monad.allowedTargetsEnforcer' deployments-monad.json)
ALLOWED_METHODS_ENFORCER=$(jq -r '.monad.allowedMethodsEnforcer' deployments-monad.json)
TIMESTAMP_ENFORCER=$(jq -r '.monad.timestampEnforcer' deployments-monad.json)
LIMITED_CALLS_ENFORCER=$(jq -r '.monad.limitedCallsEnforcer' deployments-monad.json)
NATIVE_TOKEN_PAYMENT_ENFORCER=$(jq -r '.monad.nativeTokenPaymentEnforcer' deployments-monad.json)

# Verification settings
RPC_URL="https://testnet-rpc.monad.xyz"
VERIFIER="sourcify"
VERIFIER_URL="https://sourcify-api-monad.blockvision.org"

echo "📋 Found 11 contracts to verify"
echo ""
echo "=== UUPS IMPLEMENTATIONS (5) ==="
echo "PythOracle: $PYTH_ORACLE_IMPL"
echo "RebalancerConfig: $REBALANCER_CONFIG_IMPL"
echo "UniswapHelper: $UNISWAP_HELPER_IMPL"
echo "StrategyRegistry: $STRATEGY_REGISTRY_IMPL"
echo "RebalanceExecutor: $REBALANCE_EXECUTOR_IMPL"
echo ""
echo "=== REGULAR CONTRACTS (6) ==="
echo "DelegationManager: $DELEGATION_MANAGER"
echo "AllowedTargetsEnforcer: $ALLOWED_TARGETS_ENFORCER"
echo "AllowedMethodsEnforcer: $ALLOWED_METHODS_ENFORCER"
echo "TimestampEnforcer: $TIMESTAMP_ENFORCER"
echo "LimitedCallsEnforcer: $LIMITED_CALLS_ENFORCER"
echo "NativeTokenPaymentEnforcer: $NATIVE_TOKEN_PAYMENT_ENFORCER"
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

    echo "[$((VERIFIED + FAILED + 1))/11] Verifying $NAME..."

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
verify_contract "DelegationManager" "$DELEGATION_MANAGER" "src/delegation/DelegationManager.sol:DelegationManager"
verify_contract "AllowedTargetsEnforcer" "$ALLOWED_TARGETS_ENFORCER" "src/delegation/enforcers/AllowedTargetsEnforcer.sol:AllowedTargetsEnforcer"
verify_contract "AllowedMethodsEnforcer" "$ALLOWED_METHODS_ENFORCER" "src/delegation/enforcers/AllowedMethodsEnforcer.sol:AllowedMethodsEnforcer"
verify_contract "TimestampEnforcer" "$TIMESTAMP_ENFORCER" "src/delegation/enforcers/TimestampEnforcer.sol:TimestampEnforcer"
verify_contract "LimitedCallsEnforcer" "$LIMITED_CALLS_ENFORCER" "src/delegation/enforcers/LimitedCallsEnforcer.sol:LimitedCallsEnforcer"
verify_contract "NativeTokenPaymentEnforcer" "$NATIVE_TOKEN_PAYMENT_ENFORCER" "src/delegation/enforcers/NativeTokenPaymentEnforcer.sol:NativeTokenPaymentEnforcer"

echo "========================================"
echo "VERIFICATION COMPLETE"
echo "========================================"
echo ""
echo "✅ Successfully verified: $VERIFIED"
echo "⚠️  Failed/Already verified: $FAILED"
echo ""
echo "🔍 Check contracts on explorer:"
echo "https://testnet.monadexplorer.com"
echo ""

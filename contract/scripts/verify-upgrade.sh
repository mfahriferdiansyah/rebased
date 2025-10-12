#!/bin/bash

# ========================================
# VERIFY SINGLE UPGRADED IMPLEMENTATION
# ========================================
# Verifies a newly upgraded implementation contract
#
# Usage:
#   ./scripts/verify-upgrade.sh <chain> <impl_address> <contract_type>
#
# Examples:
#   ./scripts/verify-upgrade.sh monad 0x123...abc PythOracle
#   ./scripts/verify-upgrade.sh base 0x456...def RebalanceExecutor
#
# Supported chains: monad, base
# Supported contract types:
#   - PythOracle
#   - RebalancerConfig
#   - UniswapHelper
#   - StrategyRegistry
#   - RebalanceExecutor

set -e  # Exit on error

# Check arguments
if [ $# -ne 3 ]; then
    echo "❌ Error: Invalid number of arguments"
    echo ""
    echo "Usage:"
    echo "  ./scripts/verify-upgrade.sh <chain> <impl_address> <contract_type>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/verify-upgrade.sh monad 0x123...abc PythOracle"
    echo "  ./scripts/verify-upgrade.sh base 0x456...def RebalanceExecutor"
    echo ""
    echo "Supported chains: monad, base"
    echo "Supported contracts: PythOracle, RebalancerConfig, UniswapHelper, StrategyRegistry, RebalanceExecutor"
    exit 1
fi

CHAIN=$1
IMPL_ADDRESS=$2
CONTRACT_TYPE=$3

# Validate chain
if [[ "$CHAIN" != "monad" && "$CHAIN" != "base" ]]; then
    echo "❌ Error: Invalid chain '$CHAIN'"
    echo "Supported chains: monad, base"
    exit 1
fi

# Validate contract type
VALID_CONTRACTS=("PythOracle" "RebalancerConfig" "UniswapHelper" "StrategyRegistry" "RebalanceExecutor")
VALID=false
for contract in "${VALID_CONTRACTS[@]}"; do
    if [ "$CONTRACT_TYPE" = "$contract" ]; then
        VALID=true
        break
    fi
done

if [ "$VALID" = false ]; then
    echo "❌ Error: Invalid contract type '$CONTRACT_TYPE'"
    echo "Supported contracts: ${VALID_CONTRACTS[*]}"
    exit 1
fi

# Set chain-specific parameters
if [ "$CHAIN" = "monad" ]; then
    RPC_URL="https://testnet-rpc.monad.xyz"
    VERIFIER="sourcify"
    VERIFIER_URL="https://sourcify-api-monad.blockvision.org"
    EXPLORER="https://testnet.monadexplorer.com"
    CHAIN_NAME="Monad Testnet"
else
    RPC_URL="https://sepolia.base.org"
    VERIFIER="blockscout"
    VERIFIER_URL="https://base-sepolia.blockscout.com/api/"
    EXPLORER="https://base-sepolia.blockscout.com"
    CHAIN_NAME="Base Sepolia"
fi

# Determine contract path
CONTRACT_PATH="src/${CONTRACT_TYPE}.sol:${CONTRACT_TYPE}"

echo "========================================"
echo "VERIFY UPGRADED IMPLEMENTATION"
echo "========================================"
echo ""
echo "Chain: $CHAIN_NAME"
echo "Contract: $CONTRACT_TYPE"
echo "Implementation: $IMPL_ADDRESS"
echo "Contract Path: $CONTRACT_PATH"
echo ""
echo "Verifying on $VERIFIER..."
echo ""

# Run verification
if forge verify-contract \
    --rpc-url "$RPC_URL" \
    --verifier "$VERIFIER" \
    --verifier-url "$VERIFIER_URL" \
    "$IMPL_ADDRESS" \
    "$CONTRACT_PATH"; then

    echo ""
    echo "========================================"
    echo "✅ VERIFICATION SUCCESSFUL"
    echo "========================================"
    echo ""
    echo "Contract verified successfully!"
    echo ""
    echo "🔍 View on explorer:"
    echo "$EXPLORER/address/$IMPL_ADDRESS"
    echo ""
else
    echo ""
    echo "========================================"
    echo "⚠️  VERIFICATION FAILED"
    echo "========================================"
    echo ""
    echo "Possible reasons:"
    echo "1. Contract already verified"
    echo "2. Bytecode mismatch (check foundry.toml settings)"
    echo "3. Network issues"
    echo ""
    echo "Try checking the explorer directly:"
    echo "$EXPLORER/address/$IMPL_ADDRESS"
    echo ""
    exit 1
fi

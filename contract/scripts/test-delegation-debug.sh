#!/bin/bash
# Test delegation debugging functions on Monad testnet
# This script tests all 5 debug levels sequentially to pinpoint delegation execution failures

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXECUTOR_PROXY="0x7Bf347A21BE661Eb0332b85271Ad74ef3547F864"
RPC_URL="https://testnet-rpc.monad.xyz"
BOT_PRIVATE_KEY="0xfc5125e9fdc8963c11b341c5d76b9c0aeb90758aa9dbe1e9b8c506581bcaf490"

# Test data (from database)
DELEGATOR="0x2E16Fe00258dbf519C59C7C30FA80F22fcFe8421"
STRATEGY_ID="57201943847569098084949330018924033253"  # BigInt of 7c09ed2e-f128-43fd-9c5a-d3b61a2196d9

# Delegation data from database
PERMISSION_CONTEXT="0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000002e16fe00258dbf519c59c7c30fa80f22fcfe842100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000a11000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000414acb5fa4d7f224d205bea2aa0dcd4683ee935fda99dbb7c233857038165c32790871aa46ca8ce34d66923fbe5dcb85a041311fdf723fd08770018508296b6fa31b00000000000000000000000000000000000000000000000000000000000000"
MODE="0x0100000000000000000000000000000000000000000000000000000000000000"

# Token addresses (from strategy)
USDC="0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"
WETH="0xB5a30b0FDc42e3E9760Cb8449Fb37"  # This will need to be the actual WETH address

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         DELEGATION DEBUG FUNCTION TEST SUITE                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Executor Proxy:${NC} $EXECUTOR_PROXY"
echo -e "${YELLOW}DeleGator:${NC} $DELEGATOR"
echo -e "${YELLOW}Strategy ID:${NC} $STRATEGY_ID"
echo ""

# Function to print section header
print_section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '%.0s─' {1..60})${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

#──────────────────────────────────────────────────────────────
# LEVEL 1: Test Strategy Ownership (VIEW CALL - NO TRANSACTION)
#──────────────────────────────────────────────────────────────
print_section "LEVEL 1: Test Strategy Ownership (View Call)"

echo "Testing strategy ownership validation..."
RESULT=$(cast call $EXECUTOR_PROXY \
    "testStrategyOwnership(address,uint256)(bool,address,address,string)" \
    $DELEGATOR \
    $STRATEGY_ID \
    --rpc-url $RPC_URL)

echo "Raw result: $RESULT"

# Parse the result (bool, address, address, string)
IS_VALID=$(echo "$RESULT" | awk '{print $1}')
STRATEGY_OWNER=$(echo "$RESULT" | awk '{print $2}')
DELEGATOR_OWNER=$(echo "$RESULT" | awk '{print $3}')
ERROR_MSG=$(echo "$RESULT" | awk '{print $4}')

if [ "$IS_VALID" == "true" ]; then
    print_success "Strategy ownership validation PASSED"
    echo "  Strategy Owner: $STRATEGY_OWNER"
    echo "  DeleGator Owner: $DELEGATOR_OWNER"
else
    print_error "Strategy ownership validation FAILED"
    echo "  Error: $ERROR_MSG"
    echo "  Strategy Owner: $STRATEGY_OWNER"
    echo "  DeleGator Owner: $DELEGATOR_OWNER"
    exit 1
fi

#──────────────────────────────────────────────────────────────
# LEVEL 2: Test Delegation No-Op (Tests Signature Validation)
#──────────────────────────────────────────────────────────────
print_section "LEVEL 2: Test Delegation No-Op (Signature Validation)"

echo "Testing delegation signature validation with empty execution..."
TX_HASH=$(cast send $EXECUTOR_PROXY \
    "testDelegationNoOp(address,bytes,bytes32)(bool)" \
    $DELEGATOR \
    $PERMISSION_CONTEXT \
    $MODE \
    --private-key $BOT_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy \
    2>&1 | grep "transactionHash" | awk '{print $2}')

if [ -n "$TX_HASH" ]; then
    print_success "Delegation no-op transaction sent: $TX_HASH"

    # Wait for receipt
    sleep 2
    RECEIPT=$(cast receipt $TX_HASH --rpc-url $RPC_URL 2>&1)

    if echo "$RECEIPT" | grep -q "status.*1"; then
        print_success "Delegation signature validation PASSED"
    else
        print_error "Delegation signature validation FAILED (reverted)"
        echo "$RECEIPT"
        exit 1
    fi
else
    print_error "Failed to send delegation no-op transaction"
    exit 1
fi

#──────────────────────────────────────────────────────────────
# LEVEL 3: Test Delegation Approval
#──────────────────────────────────────────────────────────────
print_section "LEVEL 3: Test Delegation Approval (ERC20 Approval)"

echo "Testing delegation with ERC20 approval..."
TX_HASH=$(cast send $EXECUTOR_PROXY \
    "testDelegationApproval(address,address,address,bytes,bytes32)(bool)" \
    $DELEGATOR \
    $USDC \
    $EXECUTOR_PROXY \
    $PERMISSION_CONTEXT \
    $MODE \
    --private-key $BOT_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy \
    2>&1 | grep "transactionHash" | awk '{print $2}')

if [ -n "$TX_HASH" ]; then
    print_success "Delegation approval transaction sent: $TX_HASH"

    sleep 2
    RECEIPT=$(cast receipt $TX_HASH --rpc-url $RPC_URL 2>&1)

    if echo "$RECEIPT" | grep -q "status.*1"; then
        print_success "Delegation approval PASSED"
    else
        print_error "Delegation approval FAILED (reverted)"
        echo "$RECEIPT"
        exit 1
    fi
else
    print_error "Failed to send delegation approval transaction"
    exit 1
fi

#──────────────────────────────────────────────────────────────
# LEVEL 4: Test Delegation Transfer
#──────────────────────────────────────────────────────────────
print_section "LEVEL 4: Test Delegation Transfer (Token Movement)"

echo "Testing delegation with token transfer (1 wei)..."
BOT_ADDRESS="0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558"

TX_HASH=$(cast send $EXECUTOR_PROXY \
    "testDelegationTransfer(address,address,address,uint256,bytes,bytes32)(bool)" \
    $DELEGATOR \
    $USDC \
    $BOT_ADDRESS \
    1 \
    $PERMISSION_CONTEXT \
    $MODE \
    --private-key $BOT_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy \
    2>&1 | grep "transactionHash" | awk '{print $2}')

if [ -n "$TX_HASH" ]; then
    print_success "Delegation transfer transaction sent: $TX_HASH"

    sleep 2
    RECEIPT=$(cast receipt $TX_HASH --rpc-url $RPC_URL 2>&1)

    if echo "$RECEIPT" | grep -q "status.*1"; then
        print_success "Delegation transfer PASSED"
    else
        print_error "Delegation transfer FAILED (reverted)"
        echo "$RECEIPT"
        exit 1
    fi
else
    print_error "Failed to send delegation transfer transaction"
    exit 1
fi

#──────────────────────────────────────────────────────────────
# LEVEL 5: Test Delegation Single Swap
#──────────────────────────────────────────────────────────────
print_section "LEVEL 5: Test Delegation Single Swap"

print_warning "Level 5 requires actual swap calldata from Monorail/Uniswap"
print_warning "Skipping for now - will be tested via bot with real swap data"

#──────────────────────────────────────────────────────────────
# Summary
#──────────────────────────────────────────────────────────────
print_section "TEST SUMMARY"

print_success "Level 1: Strategy Ownership ✓"
print_success "Level 2: Delegation No-Op ✓"
print_success "Level 3: Delegation Approval ✓"
print_success "Level 4: Delegation Transfer ✓"
print_warning "Level 5: Single Swap (requires bot with real swap data)"

echo ""
echo -e "${GREEN}All manual tests passed! Ready for bot testing.${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Set DEBUG_DELEGATION_LEVEL=1 in backend/.env"
echo "  2. Restart backend bot: cd backend && bun run start:dev"
echo "  3. Watch logs as bot tests each level"
echo "  4. Increase DEBUG_DELEGATION_LEVEL (2→3→4→5) until failure found"
echo ""

#!/bin/bash

# Verify PythOracle Configuration Script
# Checks that all required price feeds are configured correctly
#
# Usage:
#   ./scripts/verify-oracle-config.sh monad
#   ./scripts/verify-oracle-config.sh base

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get chain from argument
CHAIN=${1:-monad}

if [ "$CHAIN" != "monad" ] && [ "$CHAIN" != "base" ]; then
    echo -e "${RED}❌ Invalid chain: $CHAIN${NC}"
    echo "Usage: $0 [monad|base]"
    exit 1
fi

echo -e "${YELLOW}🔍 Verifying PythOracle configuration for $CHAIN...${NC}\n"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Set chain-specific variables
if [ "$CHAIN" = "monad" ]; then
    ORACLE=$MONAD_ORACLE
    RPC_URL=$MONAD_RPC_URL
    WETH=0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37
    USDC=0xf817257fed379853cDe0fa4F97AB987181B1E5Ea
else
    ORACLE=$BASE_ORACLE
    RPC_URL=$BASE_RPC_URL
    WETH=0x4200000000000000000000000000000000000006
    USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e
fi

# Verify Oracle address
if [ -z "$ORACLE" ]; then
    echo -e "${RED}❌ Oracle address not set in .env${NC}"
    exit 1
fi

echo -e "Oracle Address: ${GREEN}$ORACLE${NC}"
echo -e "RPC URL: ${GREEN}$RPC_URL${NC}\n"

# Check if contract has code
echo "Checking contract deployment..."
CODE=$(cast code $ORACLE --rpc-url $RPC_URL)
if [ "$CODE" = "0x" ]; then
    echo -e "${RED}❌ No code at Oracle address - contract not deployed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Contract deployed${NC}\n"

# Check owner
echo "Checking owner..."
OWNER=$(cast call $ORACLE "owner()(address)" --rpc-url $RPC_URL)
echo -e "Owner: ${GREEN}$OWNER${NC}\n"

# Check version
echo "Checking version..."
VERSION=$(cast call $ORACLE "version()(string)" --rpc-url $RPC_URL)
echo -e "Version: ${GREEN}$VERSION${NC}\n"

# Check maxPriceAge
echo "Checking maxPriceAge..."
MAX_AGE=$(cast call $ORACLE "maxPriceAge()(uint256)" --rpc-url $RPC_URL)
MAX_AGE_DEC=$((16#${MAX_AGE#0x}))
echo -e "Max Price Age: ${GREEN}${MAX_AGE_DEC}s${NC}"
if [ "$MAX_AGE_DEC" -lt 60 ]; then
    echo -e "${YELLOW}⚠️  Warning: maxPriceAge < 60s may cause issues on testnets${NC}"
fi
echo ""

# Check WETH price feed
echo "Checking WETH price feed..."
WETH_FEED=$(cast call $ORACLE "priceFeeds(address)(bytes32)" $WETH --rpc-url $RPC_URL)
if [ "$WETH_FEED" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo -e "${RED}❌ WETH price feed not configured${NC}"
    WETH_OK=false
else
    echo -e "${GREEN}✓ WETH feed configured: $WETH_FEED${NC}"

    # Try to get price
    echo "  Testing WETH price fetch..."
    WETH_PRICE=$(cast call $ORACLE "getPrice(address)(uint256)" $WETH --rpc-url $RPC_URL 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓ WETH price fetch successful${NC}"
        echo "    Price: $WETH_PRICE"
        WETH_OK=true
    else
        echo -e "  ${RED}❌ Failed to fetch WETH price:${NC}"
        echo "  $WETH_PRICE"
        WETH_OK=false
    fi
fi
echo ""

# Check USDC price feed
echo "Checking USDC price feed..."
USDC_FEED=$(cast call $ORACLE "priceFeeds(address)(bytes32)" $USDC --rpc-url $RPC_URL)
if [ "$USDC_FEED" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo -e "${RED}❌ USDC price feed not configured${NC}"
    USDC_OK=false
else
    echo -e "${GREEN}✓ USDC feed configured: $USDC_FEED${NC}"

    # Try to get price
    echo "  Testing USDC price fetch..."
    USDC_PRICE=$(cast call $ORACLE "getPrice(address)(uint256)" $USDC --rpc-url $RPC_URL 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓ USDC price fetch successful${NC}"
        echo "    Price: $USDC_PRICE"
        USDC_OK=true
    else
        echo -e "  ${RED}❌ Failed to fetch USDC price:${NC}"
        echo "  $USDC_PRICE"
        USDC_OK=false
    fi
fi
echo ""

# Test batch price fetch
echo "Testing batch price fetch..."
if BATCH_PRICES=$(cast call $ORACLE "batchGetPrices(address[])(uint256[])" "[$WETH,$USDC]" --rpc-url $RPC_URL 2>&1); then
    echo -e "${GREEN}✓ Batch fetch works${NC}"
    BATCH_OK=true
else
    echo -e "${RED}❌ Batch fetch failed:${NC}"
    echo "$BATCH_PRICES"
    BATCH_OK=false
fi
echo ""

# Summary
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}           SUMMARY${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

if [ "$WETH_OK" = true ] && [ "$USDC_OK" = true ] && [ "$BATCH_OK" = true ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}Oracle is properly configured for $CHAIN${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed${NC}"
    echo ""
    echo "To fix, run:"
    echo ""

    if [ "$WETH_OK" != true ]; then
        echo -e "${YELLOW}# Configure WETH price feed${NC}"
        echo "cast send $ORACLE \\"
        echo "  \"setPriceFeed(address,bytes32)\" \\"
        echo "  $WETH \\"
        echo "  0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace \\"
        echo "  --private-key \$BOT_PRIVATE_KEY \\"
        echo "  --rpc-url $RPC_URL \\"
        echo "  --gas-limit 500000"
        echo ""
    fi

    if [ "$USDC_OK" != true ]; then
        echo -e "${YELLOW}# Configure USDC price feed${NC}"
        echo "cast send $ORACLE \\"
        echo "  \"setPriceFeed(address,bytes32)\" \\"
        echo "  $USDC \\"
        echo "  0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a \\"
        echo "  --private-key \$BOT_PRIVATE_KEY \\"
        echo "  --rpc-url $RPC_URL \\"
        echo "  --gas-limit 500000"
        echo ""
    fi

    if [ "$MAX_AGE_DEC" -lt 60 ]; then
        echo -e "${YELLOW}# Increase maxPriceAge (for testnets)${NC}"
        echo "cast send $ORACLE \\"
        echo "  \"setMaxPriceAge(uint256)\" \\"
        echo "  3600 \\"
        echo "  --private-key \$BOT_PRIVATE_KEY \\"
        echo "  --rpc-url $RPC_URL"
        echo ""
    fi

    exit 1
fi

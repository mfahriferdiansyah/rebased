#!/bin/bash

# Usage: ./scripts/decode-rebalance-tx.sh [TX_HASH]
# Decodes debug events from a failed rebalance transaction

if [ -z "$1" ]; then
    echo "Usage: ./scripts/decode-rebalance-tx.sh [TX_HASH]"
    echo ""
    echo "Example: ./scripts/decode-rebalance-tx.sh 0x123..."
    exit 1
fi

TX_HASH=$1
RPC_URL="https://testnet-rpc.monad.xyz"

echo "=== Decoding Rebalance Transaction ==="
echo "TX: $TX_HASH"
echo ""

# Get transaction receipt with logs
echo "Fetching transaction logs..."
cast receipt $TX_HASH --rpc-url $RPC_URL --json | jq -r '
.logs[] |
select(.topics[0] | startswith("0x")) |
"Topic: \(.topics[0])\nData: \(.data)\n---"
'

echo ""
echo "=== Debug Event Signatures ==="
echo "DebugRebalanceStarted:      $(cast sig-event 'DebugRebalanceStarted(address indexed,uint256 indexed,address)')"
echo "DebugStrategyFetched:       $(cast sig-event 'DebugStrategyFetched(address indexed,uint256 indexed,bool,address)')"
echo "DebugDeleGatorValidated:    $(cast sig-event 'DebugDeleGatorValidated(address indexed,address)')"
echo "DebugDriftCalculated:       $(cast sig-event 'DebugDriftCalculated(uint256,uint256,uint256)')"
echo "DebugSwapValidationPassed:  $(cast sig-event 'DebugSwapValidationPassed(uint256)')"
echo "DebugBeforeDelegationCall:  $(cast sig-event 'DebugBeforeDelegationCall(uint256,uint256,uint256)')"
echo "DebugAfterDelegationCall:   $(cast sig-event 'DebugAfterDelegationCall(uint256,uint256,uint256,uint256)')"
echo ""
echo "Compare the topics above with transaction logs to identify which debug events were emitted."
echo "The last debug event emitted before the error tells us where the failure occurred."

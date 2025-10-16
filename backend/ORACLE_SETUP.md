# PythOracle Setup & Configuration Guide

Quick reference for configuring PythOracle after deployment.

## Prerequisites

- `cast` (Foundry) installed
- Bot private key with owner permissions on Oracle contract
- RPC endpoint for target chain

## Quick Setup (Monad Testnet)

```bash
# Set environment variables
export ORACLE=0xf1B7083a8E624038Befe432EEBBF2a8f3aa47D22
export WETH=0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37
export USDC=0xf817257fed379853cDe0fa4F97AB987181B1E5Ea
export BOT_KEY=0xfc5125e9fdc8963c11b341c5d76b9c0aeb90758aa9dbe1e9b8c506581bcaf490
export RPC_URL=https://testnet-rpc.monad.xyz

# Configure WETH price feed (ETH/USD)
cast send $ORACLE \
  "setPriceFeed(address,bytes32)" \
  $WETH \
  0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace \
  --private-key $BOT_KEY --rpc-url $RPC_URL --gas-limit 500000

# Configure USDC price feed (USDC/USD)
cast send $ORACLE \
  "setPriceFeed(address,bytes32)" \
  $USDC \
  0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a \
  --private-key $BOT_KEY --rpc-url $RPC_URL --gas-limit 500000

# CRITICAL: Increase staleness tolerance for testnets
cast send $ORACLE \
  "setMaxPriceAge(uint256)" \
  3600 \
  --private-key $BOT_KEY --rpc-url $RPC_URL
```

## Verification

Run the automated verification script:

```bash
cd rebased/backend
./scripts/verify-oracle-config.sh monad
```

**Expected output:**
```
✓ WETH feed configured
✓ WETH price fetch successful
✓ USDC feed configured
✓ USDC price fetch successful
✓ Batch fetch works
✓ All checks passed!
```

## Pyth Price Feed IDs

Standard feeds (same on all chains):

| Asset | Feed ID |
|-------|---------|
| ETH/USD | `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |
| USDC/USD | `0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a` |
| BTC/USD | `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` |

Full list: https://pyth.network/developers/price-feed-ids

## Manual Verification

```bash
# Check WETH price
cast call $ORACLE "getPrice(address)(uint256)" $WETH --rpc-url $RPC_URL

# Check USDC price
cast call $ORACLE "getPrice(address)(uint256)" $USDC --rpc-url $RPC_URL

# Check batch prices
cast call $ORACLE \
  "batchGetPrices(address[])(uint256[])" \
  "[$WETH,$USDC]" \
  --rpc-url $RPC_URL
```

## Configuration Parameters

### maxPriceAge

How old price data can be before considered stale:

- **Mainnet**: 60-300 seconds (Pyth updates frequently)
- **Testnet**: 3600 seconds (1 hour) - feeds often stale

```bash
# Set 1 hour for testnet
cast send $ORACLE "setMaxPriceAge(uint256)" 3600 \
  --private-key $BOT_KEY --rpc-url $RPC_URL
```

### maxConfidenceRatio

Maximum confidence interval (basis points):

- Default: 100 bps (1%) - industry standard
- Range: 10-1000 bps (0.1%-10%)

```bash
# Set to 2% (200 bps)
cast send $ORACLE "setMaxConfidenceRatio(uint256)" 200 \
  --private-key $BOT_KEY --rpc-url $RPC_URL
```

### Stablecoin Fallback

Mark tokens as stablecoins to return $1 if Pyth unavailable:

```bash
cast send $ORACLE "setStablecoin(address,bool)" $USDC true \
  --private-key $BOT_KEY --rpc-url $RPC_URL
```

## Common Issues

### Error: `0x19abf40e` (PriceFeedNotFound)

**Cause**: Price feed not configured or stale data

**Fix**:
1. Configure price feed (see Quick Setup above)
2. Increase `maxPriceAge` for testnets

### No Code at Address

**Cause**: Wrong Oracle address in `.env`

**Fix**: Verify address in deployment docs:
- Check `E2E-TEST-SUMMARY.md`
- Check `docs/DEPLOYED_CONTRACTS.md`
- Update `.env` with correct address

### Transaction Reverts

**Cause**: Not contract owner

**Fix**: Verify bot address is owner:
```bash
cast call $ORACLE "owner()(address)" --rpc-url $RPC_URL
```

## Chain-Specific Addresses

### Monad Testnet
```
Oracle: 0xf1B7083a8E624038Befe432EEBBF2a8f3aa47D22
WETH:   0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37
USDC:   0xf817257fed379853cDe0fa4F97AB987181B1E5Ea
```

### Base Sepolia
```
Oracle: 0xe21e88f31a639d661e2d50D3c9E5DF1B1E3acff2
WETH:   0x4200000000000000000000000000000000000006
USDC:   0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## Resources

- **Pyth Docs**: https://docs.pyth.network/
- **Feed IDs**: https://pyth.network/developers/price-feed-ids
- **Error Codes**: https://docs.pyth.network/price-feeds/api-reference#error-codes
- **Contract Addresses**: https://docs.pyth.network/price-feeds/contract-addresses
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`

---

**Last Updated**: 2025-10-17

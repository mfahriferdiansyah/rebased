# Contract Verification Guide

Complete guide for verifying Rebased smart contracts on block explorers.

## Why Verify Contracts?

✅ **Transparency**: Users can read your source code
✅ **Trust**: Prove your deployed bytecode matches your source
✅ **Debugging**: Easier interaction through block explorers
✅ **Auditing**: External parties can review your code

## Quick Start

### Automatic Verification

Run the verification script for your deployed contracts:

```bash
# Base Sepolia
cd rebased/contract
forge script script/VerifyContracts.s.sol --rpc-url https://sepolia.base.org

# Monad Testnet
forge script script/VerifyContracts.s.sol --rpc-url https://testnet-rpc.monad.xyz
```

The script will output all verification commands. Copy and run them one by one.

## Supported Chains

### Base Sepolia (Chain ID: 84532)

**Explorer**: https://base-sepolia.blockscout.com
**Verifier**: Blockscout (FREE - no API key needed)
**RPC**: `https://sepolia.base.org` or `https://sepolia-preconf.base.org`

```bash
# Example verification command
forge verify-contract \
  --rpc-url https://sepolia.base.org \
  --verifier blockscout \
  --verifier-url 'https://base-sepolia.blockscout.com/api/' \
  <address> \
  <ContractPath>:<ContractName>
```

### Monad Testnet (Chain ID: 10143)

**Explorer**: https://testnet.monadexplorer.com
**Verifier**: Sourcify (FREE - no API key needed)
**Sourcify API**: `https://sourcify-api-monad.blockvision.org` (NO `/api` suffix)

```bash
# Example verification command
forge verify-contract \
  --rpc-url https://testnet-rpc.monad.xyz \
  --verifier sourcify \
  --verifier-url 'https://sourcify-api-monad.blockvision.org' \
  <address> \
  <ContractPath>:<ContractName>
```

## Contract Architecture

Rebased uses the **UUPS Proxy Pattern** for upgradeability:

### Proxies vs Implementations

- **Proxy**: User-facing contract (stores state, delegates calls)
- **Implementation**: Logic contract (upgradeable)

**IMPORTANT**: We verify **implementations**, not proxies.

### Contracts to Verify

**Per Chain: 11 contracts total**

#### UUPS Implementations (5 contracts)
1. PythOracle Implementation
2. RebalancerConfig Implementation
3. UniswapHelper Implementation
4. StrategyRegistry Implementation
5. RebalanceExecutor Implementation

#### Regular Contracts (6 contracts)
6. DelegationManager
7. AllowedTargetsEnforcer
8. AllowedMethodsEnforcer
9. TimestampEnforcer
10. LimitedCallsEnforcer
11. NativeTokenPaymentEnforcer

## Step-by-Step Verification

### Step 1: Ensure Correct Foundry Settings

**CRITICAL**: Your `foundry.toml` must have these settings for Sourcify/Blockscout compatibility:

```toml
[profile.default]
# ... other settings ...

# Contract verification settings (for Sourcify & Blockscout)
metadata = true
metadata_hash = "none"  # NOT bytecode_hash!
use_literal_content = true
```

If these settings were added AFTER deployment, you must **redeploy** for verification to work.

### Step 2: Get Contract Addresses

Addresses are saved in `deployments-{chain}.json` after deployment:

```bash
# Base Sepolia
cat deployments-base.json

# Monad Testnet
cat deployments-monad.json
```

Implementation addresses have `Impl` suffix in the JSON.

### Step 3: Run Verification Script

```bash
# This generates all verification commands
forge script script/VerifyContracts.s.sol --rpc-url <rpc_url>
```

### Step 4: Execute Verification Commands

Copy the output commands and run them one by one.

**Base Sepolia Example**:
```bash
forge verify-contract \
  --rpc-url https://sepolia.base.org \
  --verifier blockscout \
  --verifier-url 'https://base-sepolia.blockscout.com/api/' \
  0x577532DE03349AA8713993AB1bcd68B078CCD382 \
  src/PythOracle.sol:PythOracle
```

**Monad Testnet Example**:
```bash
forge verify-contract \
  --rpc-url https://testnet-rpc.monad.xyz \
  --verifier sourcify \
  --verifier-url 'https://sourcify-api-monad.blockvision.org' \
  0x3125481D17922aBA4069e9d1d57794eaF95C61dd \
  src/PythOracle.sol:PythOracle
```

### Step 5: Verify on Block Explorer

Visit the explorer to confirm verification:

**Base Sepolia**: https://base-sepolia.blockscout.com/address/<your_address>
**Monad Testnet**: https://testnet.monadexplorer.com/address/<your_address>

Look for:
- ✅ Green checkmark next to contract
- "Contract Source Code Verified" message
- Source code tab with your Solidity code

## Complete Verification Workflow

For a clean deployment with verification:

```bash
# 1. Ensure foundry.toml has correct metadata settings
cat foundry.toml | grep -A2 "metadata"

# 2. Clean build with correct settings
forge clean && forge build

# 3. Deploy to Monad
export PRIVATE_KEY=<your_key>
export CHAIN_NAME=monad
export PYTH_CONTRACT=0x2880aB155794e7179c9eE2e38200202908C17B43
export UNISWAP_V2_ROUTER=0xfb8e1c3b833f9e67a71c859a132cf783b645e436
export UNISWAP_V2_FACTORY=0x733e88f248b742db6c14c0b1713af5ad7fdd59d0
forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast --legacy

# 4. Generate verification commands
forge script script/VerifyContracts.s.sol --rpc-url https://testnet-rpc.monad.xyz

# 5. Run each verification command from output
# (Copy and paste each command)

# 6. Deploy to Base Sepolia
export CHAIN_NAME=base
export PYTH_CONTRACT=0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
export UNISWAP_V2_ROUTER=0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
export UNISWAP_V2_FACTORY=0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --legacy

# 7. Generate verification commands
forge script script/VerifyContracts.s.sol --rpc-url https://sepolia.base.org

# 8. Run each verification command
# (Copy and paste each command)
```

## Troubleshooting

### Error: "Already Verified"

Contract is already verified. Check the explorer.

### Error: "The deployed and recompiled bytecode don't match"

**Root Cause**: Contracts were deployed BEFORE metadata settings were added to `foundry.toml`.

**Solution**: Redeploy contracts with correct settings:

```bash
# 1. Verify foundry.toml has correct settings
grep -A3 "metadata" foundry.toml
# Should show:
#   metadata = true
#   metadata_hash = "none"
#   use_literal_content = true

# 2. Clean rebuild
forge clean && forge build

# 3. Redeploy
forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast --legacy
```

### Error: "Compilation Failed"

Ensure:
1. Correct Solidity version (0.8.23)
2. Correct optimizer settings (200 runs, via_ir=true)
3. All dependencies installed (`forge install`)

```bash
# Force rebuild
forge clean && forge build
```

### Error: "Did you mean to use the API endpoint `/api`?"

**For Base Sepolia**: URL is correct with `/api/` at end
**For Monad**: URL should NOT have `/api` at end

Correct URLs:
- Base: `https://base-sepolia.blockscout.com/api/`
- Monad: `https://sourcify-api-monad.blockvision.org` (no `/api`)

### Error: "Rate Limited"

Wait 1-2 minutes between verification requests, or add delays between commands.

### Verification Stuck

The verification may take 1-2 minutes to process. Be patient.

For Sourcify (Monad), verification is instant if successful.
For Blockscout (Base), verification status is returned immediately.

## No API Keys Required! 🎉

**Both chains use FREE verification:**
- **Base Sepolia**: Blockscout (free, open-source)
- **Monad Testnet**: Sourcify (free, open-source)

No need for Basescan API keys or Monad Explorer API keys.

## Verification Script Architecture

The `VerifyContracts.s.sol` script:

1. Reads deployed addresses from `deployments-{chain}.json`
2. Detects chain ID (84532 for Base, 10143 for Monad)
3. Outputs chain-specific verification commands
4. Includes both UUPS implementations and regular contracts

**To use:**
```bash
forge script script/VerifyContracts.s.sol --rpc-url <rpc_url>
```

The script is **read-only** - it generates commands but doesn't execute them. You must copy and run each command manually.

## Best Practices

✅ **Set metadata settings BEFORE first deployment**
✅ **Verify immediately after deployment**
✅ **Verify all implementations, not just main contracts**
✅ **Keep deployment JSONs in version control**
✅ **Use same compiler settings as deployment**
✅ **Verify on both chains for multi-chain deployments**
✅ **Test verification on testnet before mainnet**

## Common Mistakes to Avoid

❌ Using `bytecode_hash` instead of `metadata_hash` in foundry.toml
❌ Adding `/api` to Monad Sourcify URL
❌ Trying to verify contracts deployed before metadata settings were added
❌ Verifying proxy addresses instead of implementation addresses
❌ Using wrong RPC URL for verification

## Upgrading Contracts

### Why Verify After Upgrade?

**YES, you MUST verify after EVERY upgrade!**

When you upgrade a UUPS contract:
- A **NEW implementation contract** is deployed at a **NEW address**
- The proxy address stays the same (users keep using the same address)
- The proxy's implementation slot is updated to point to the new implementation

**The new implementation MUST be verified** so users can see the new source code.

### Upgrade Methods

#### Method 1: Upgrade Single Contract

Use `Upgrade.s.sol` to upgrade one contract:

```bash
# Monad Testnet
export PRIVATE_KEY=<your_key>
export PROXY_ADDRESS=0x184f0CAeDF055cfDEedb7990aABCDDcA8A87378e  # From deployments-monad.json
export CONTRACT_TYPE=PythOracle  # One of: PythOracle, RebalancerConfig, UniswapHelper, StrategyRegistry, RebalanceExecutor
forge script script/Upgrade.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast --legacy

# Base Sepolia
export PROXY_ADDRESS=0xEED2111eD81c70f4A5cd903626201b7A8E811146  # From deployments-base.json
export CONTRACT_TYPE=PythOracle
forge script script/Upgrade.s.sol --rpc-url https://sepolia.base.org --broadcast --legacy
```

The script will:
1. Deploy new implementation
2. Upgrade the proxy
3. Verify upgrade succeeded
4. **Output verification command** - copy and run it!

#### Method 2: Upgrade ALL Contracts

Use `UpgradeAll.s.sol` to upgrade all 5 UUPS contracts at once:

```bash
# Monad Testnet
export PRIVATE_KEY=<your_key>
export CHAIN_NAME=monad
forge script script/UpgradeAll.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast --legacy

# Base Sepolia
export CHAIN_NAME=base
forge script script/UpgradeAll.s.sol --rpc-url https://sepolia.base.org --broadcast --legacy
```

The script will:
1. Read all proxy addresses from `deployments-{chain}.json`
2. Deploy 5 new implementations
3. Upgrade all 5 proxies
4. Update JSON with new implementation addresses
5. **Output 5 verification commands** - copy and run them all!

### Verify Upgraded Implementations

#### Option A: Use Shell Script (Easiest)

We provide a convenience script for verifying single upgraded implementations:

```bash
# Verify on Monad
./scripts/verify-upgrade.sh monad <impl_address> <contract_type>

# Verify on Base
./scripts/verify-upgrade.sh base <impl_address> <contract_type>

# Example
./scripts/verify-upgrade.sh monad 0x1707D68AB3526E55850530C2579CeA6E82E0B764 PythOracle
```

#### Option B: Manual Verification

Copy the verification command from the upgrade script output and run it.

**Monad Example:**
```bash
forge verify-contract \
  --rpc-url https://testnet-rpc.monad.xyz \
  --verifier sourcify \
  --verifier-url 'https://sourcify-api-monad.blockvision.org' \
  0x1707D68AB3526E55850530C2579CeA6E82E0B764 \
  src/PythOracle.sol:PythOracle
```

**Base Example:**
```bash
forge verify-contract \
  --rpc-url https://sepolia.base.org \
  --verifier blockscout \
  --verifier-url 'https://base-sepolia.blockscout.com/api/' \
  0x123...abc \
  src/PythOracle.sol:PythOracle
```

### Complete Upgrade Workflow

**Full workflow for upgrading all contracts:**

```bash
# 1. Upgrade all 5 UUPS contracts
export PRIVATE_KEY=<your_key>
export CHAIN_NAME=monad
forge script script/UpgradeAll.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast --legacy

# 2. Script outputs 5 verification commands - copy them

# 3. Run all 5 verification commands
# (Paste each command)

# 4. Confirm all 5 are verified on explorer
```

### Automated Verification Scripts

We provide shell scripts to automate verification:

**Verify All Contracts (Post-Deployment):**
```bash
# Verify all 11 contracts on Monad
./scripts/verify-all-monad.sh

# Verify all 11 contracts on Base
./scripts/verify-all-base.sh
```

**Verify Single Upgraded Implementation:**
```bash
# Monad
./scripts/verify-upgrade.sh monad <impl_address> <contract_type>

# Base
./scripts/verify-upgrade.sh base <impl_address> <contract_type>
```

**Requirements:**
- `jq` installed (`brew install jq` on macOS)
- `forge` installed and in PATH
- Run from `rebased/contract` directory

### Upgrade Best Practices

✅ **Test upgrades on testnet first**
✅ **Verify immediately after upgrade**
✅ **Check explorer to confirm verification**
✅ **Keep deployment JSONs updated**
✅ **Document what changed in each upgrade**
✅ **Verify ALL new implementations, not just one**

### Upgrade Troubleshooting

**Error: "Upgrade failed - implementation mismatch"**
- The upgrade transaction failed
- Check you're the owner of the proxy
- Ensure correct proxy address

**Error: "Contract already verified"**
- Implementation was already verified
- This is fine, means it's already done!

**New implementation not showing on explorer**
- Wait 1-2 minutes for indexing
- Refresh the explorer page
- Check the correct chain

## Shell Scripts Reference

All scripts located in `scripts/` directory:

### verify-all-monad.sh
Verifies all 11 contracts on Monad Testnet using addresses from `deployments-monad.json`.

**Usage:**
```bash
./scripts/verify-all-monad.sh
```

**Requirements:** `jq` installed, run from `rebased/contract` directory

### verify-all-base.sh
Verifies all 11 contracts on Base Sepolia using addresses from `deployments-base.json`.

**Usage:**
```bash
./scripts/verify-all-base.sh
```

**Requirements:** `jq` installed, run from `rebased/contract` directory

### verify-upgrade.sh
Verifies a single upgraded implementation contract.

**Usage:**
```bash
./scripts/verify-upgrade.sh <chain> <impl_address> <contract_type>
```

**Examples:**
```bash
./scripts/verify-upgrade.sh monad 0x1707...B764 PythOracle
./scripts/verify-upgrade.sh base 0x123...abc RebalanceExecutor
```

**Supported Chains:** `monad`, `base`

**Supported Contracts:** `PythOracle`, `RebalancerConfig`, `UniswapHelper`, `StrategyRegistry`, `RebalanceExecutor`

## Resources

- **Foundry Verification Docs**: https://book.getfoundry.sh/reference/forge/forge-verify-contract
- **Blockscout Verification**: https://docs.blockscout.com/devs/verification/foundry-verification
- **Sourcify**: https://sourcify.dev/
- **Base Sepolia Explorer**: https://base-sepolia.blockscout.com
- **Monad Explorer**: https://testnet.monadexplorer.com

## Current Deployments

### Monad Testnet (Chain ID: 10143)

All 11 contracts verified on Sourcify ✅

**UUPS Implementations:**
- PythOracle: `0x3125481D17922aBA4069e9d1d57794eaF95C61dd`
- RebalancerConfig: `0x728f2D037c7E7f91c661d887eD65B3e20427Fa31`
- UniswapHelper: `0x30E55cBE671840F4A0cE5ec874d22C97d5fDEf47`
- StrategyRegistry: `0x077CC443D82838f769334532C5149b54EaBAc834`
- RebalanceExecutor: `0xC94ba3c50e29787ded9eb03989D3BF54ee6defE5`

**Regular Contracts:**
- DelegationManager: `0xf303c1748c4f8589DCfF0E501a252F49c355c28D`
- AllowedTargetsEnforcer: `0x543bDBD6d56Df6b97B25A619DbAbd96FB2a6E767`
- AllowedMethodsEnforcer: `0xA04c4257294395DE695286FE689017b238edE7Ae`
- TimestampEnforcer: `0xaED9D86a72A404ba6559C6bF1f3b877455387073`
- LimitedCallsEnforcer: `0xf7ebeC3f5077D5fa28C0cB60C408B22CD436d019`
- NativeTokenPaymentEnforcer: `0x5d5810aB86deE9e9f61343f4753Bcd94d5E091Ae`

### Base Sepolia (Chain ID: 84532)

All 11 contracts verified on Blockscout ✅

**UUPS Implementations:**
- PythOracle: `0x577532DE03349AA8713993AB1bcd68B078CCD382`
- RebalancerConfig: `0xBF6ddb87Ec7Fbac3c97f613A70448f3aefB63778`
- UniswapHelper: `0x563dFdA1a509cd75415bf3b0c8189ebA6C6079e0`
- StrategyRegistry: `0x167123B6fD2275AC0c50959Dcd67Eba127f5F988`
- RebalanceExecutor: `0x3a8075A29E390F96582b64d75A19425709B4FdD4`

**Regular Contracts:**
- DelegationManager: `0xDE6E87032590693Aa1Df4fb5a9617A81EE5dee89`
- AllowedTargetsEnforcer: `0x4B4C305928265C2f28B90265ccc4e2517Ee6889b`
- AllowedMethodsEnforcer: `0xB051e91CcDC5D565f4b091fD70EC78d931dCBc50`
- TimestampEnforcer: `0xb4622b8Ccaba8F532CFb97BAB76904084eD439f8`
- LimitedCallsEnforcer: `0x61f1b0D08D54de11B9E91881d0b201402623e6cC`
- NativeTokenPaymentEnforcer: `0x690587bF1584cFCe1C4142EA381CAE83535345b4`

## Support

- **Rebased Discord**: Get help from the team
- **Foundry GitHub**: https://github.com/foundry-rs/foundry/issues
- **Monad Discord**: For Monad-specific verification issues

---

**Last Updated**: 2025-10-10
**Rebased Contract Version**: 1.0.0

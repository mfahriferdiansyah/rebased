# E2E Test Setup - Complete Summary

## ✅ Setup Status: READY FOR TESTING

All contracts deployed, database configured, bot compiled successfully.

---

## 1. Smart Contracts Deployed

### Monad Testnet (Chain ID: 10143)
- **StrategyRegistry**: `0x6655e6ee9a1BcF91047C9c0b1f4bAf56E2cfd146`
- **RebalanceExecutor**: `0xc5bd44d66d3cCe2D534972A749060472e7Ec78c9`
- **PythOracle**: `0xf1B7083a8E624038Befe432EEBBF2a8f3aa47D22`
- **DelegationManager**: `0x96a355552bBAbBAA0E36072e836d5eD9909C452f`
- **UniswapHelper**: `0xB28D94A601D44cef3ECB533d76877386873C8498`
- **RebalancerConfig**: `0xC35D7fA8f72d72329af11bDD9c1f26930f292A0b`

### Base Sepolia (Chain ID: 84532)
- **StrategyRegistry**: `0xf48bBD37096fE7C1bAC6694d54E6a887861E3855`
- **RebalanceExecutor**: `0x2cd47f7Cf22594fD1f40AA1b1F3C9a0c1d585BaC`
- **PythOracle**: `0xe21e88f31a639d661e2d50D3c9E5DF1B1E3acff2`
- **DelegationManager**: `0x7c182Db65D653E5eD5424Ed77928917387E83D17`

---

## 2. Test Wallet Configuration

- **User Address**: `0x47B245f2A3c7557d855E4d800890C4a524a42Cc8`
- **Private Key**: `0x84879ffe9f0b582b956f4870f8b12b0481095a8f19383e0744f0ef293f7f89f4`
- **Bot Address**: `0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558`

### Initial Balances (Monad Testnet)
- **MON (Native)**: 253.64 MON
- **USDC**: 64.47 USDC

### Portfolio Analysis
- **Current Allocation**: 79.7% MON / 20.3% USDC
- **Target Allocation**: 50% MON / 50% USDC
- **Drift**: **29.73%** ⚠️ (Well above 5% threshold)
- **Status**: ✅ **REBALANCE NEEDED**

---

## 3. Database Setup

### User Record
- ✅ User created in database
- Address: `0x47B245f2A3c7557d855E4d800890C4a524a42Cc8`

### Strategy Record
- ✅ Strategy created
- Strategy ID: `1`
- Name: "50/50 MON/USDC Test Strategy"
- Tokens: `[MON, USDC]`
- Weights: `[5000, 5000]` (50/50)
- Rebalance Interval: 1 hour (3600 seconds)

### Delegation Record
- ✅ Delegation created
- Delegate (Bot): `0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558`
- Delegator: `0x47B245f2A3c7557d855E4d800890C4a524a42Cc8`
- Status: Active
- Expires: 30 days from creation

---

## 4. DEX Integration

### Monad Testnet DEX Strategy
- **Primary**: Monorail (DEX aggregator)
  - Endpoint: `https://testnet-pathfinder.monorail.xyz/v4`
  - Features: Smart routing, multi-hop swaps
- **Fallback**: Uniswap V2
  - Router: `0xfb8e1c3b833f9e67a71c859a132cf783b645e436`

### Token Addresses (Monad)
- **MON (Native)**: `0x0000000000000000000000000000000000000000`
- **USDC**: `0xf817257fed379853cDe0fa4F97AB987181B1E5Ea`

---

## 5. Backend Services

### Compilation Status
- ✅ Bot compiled successfully (0 errors)
- ✅ All TypeScript errors fixed
- ✅ Monorail integration complete

### Services Configured
- ✅ DexService (Monorail + Uniswap V2)
- ✅ GasService (gas price tracking)
- ✅ MEVService (MEV protection)
- ✅ StrategyEngineService (strategy evaluation)
- ✅ ExecutorProcessor (rebalance execution)

---

## 6. How to Run E2E Test

### Prerequisites
```bash
# Ensure services are running
brew services start postgresql
brew services start redis
```

### Option A: Automatic (Recommended)
```bash
cd /Users/kadzu/Documents/Repositories/rebased-monorepo/rebased/backend

# 1. Start API (terminal 1)
npm run start:dev

# 2. Start Bot (terminal 2)
cd apps/bot
npm run start:dev

# Bot will automatically:
# - Monitor the strategy
# - Detect 29.73% drift
# - Execute rebalance via Monorail
# - Fall back to Uniswap V2 if needed
```

### Option B: Manual Testing
```bash
# Create manual test script (if needed)
npx tsx test-manual-rebalance.ts
```

---

## 7. Expected Test Flow

1. **Bot Startup**
   - Connects to PostgreSQL
   - Connects to Redis
   - Initializes blockchain clients

2. **Strategy Monitoring**
   - Bot queries active strategies from database
   - Finds test strategy (50/50 MON/USDC)
   - Analyzes current portfolio state

3. **Drift Detection**
   - Calculates drift: **29.73%**
   - Compares to threshold: **5%**
   - Decision: **REBALANCE NEEDED** ✓

4. **Rebalance Execution**
   - Generates swap plan to achieve 50/50
   - Gets quote from Monorail API
   - Falls back to Uniswap V2 if Monorail fails
   - Simulates transaction
   - Executes rebalance on-chain

5. **Post-Execution**
   - Records rebalance in database
   - Emits notification event
   - Updates portfolio state

---

## 8. Monitoring & Verification

### Check Bot Logs
```bash
# Bot should log:
- "Strategy monitor starting..."
- "Found X active strategies"
- "Strategy drift: 29.73% (threshold: 5%)"
- "Getting Monorail quote..."
- "Executing strategy..."
- "Rebalance completed successfully: 0x..."
```

### Verify On-Chain
```bash
# Check transaction
cast tx <TX_HASH> --rpc-url https://testnet-rpc.monad.xyz

# Check updated balances
cast balance 0x47B245f2A3c7557d855E4d800890C4a524a42Cc8 --rpc-url https://testnet-rpc.monad.xyz
cast call 0xf817257fed379853cDe0fa4F97AB987181B1E5Ea "balanceOf(address)(uint256)" 0x47B245f2A3c7557d855E4d800890C4a524a42Cc8 --rpc-url https://testnet-rpc.monad.xyz
```

### Verify Database
```bash
# Check rebalance record
psql $DATABASE_URL -c "SELECT * FROM rebalances ORDER BY \"executedAt\" DESC LIMIT 1;"
```

---

## 9. Troubleshooting

### Bot Not Starting
```bash
# Check .env configuration
cat .env | grep -E "(MONAD|DATABASE|REDIS)"

# Verify services
pg_isready
redis-cli ping
```

### No Rebalance Triggered
- Check strategy `isActive` flag in database
- Verify delegation `isActive` flag
- Check bot logs for errors
- Ensure sufficient gas balance for bot

### Monorail API Errors
- Bot will automatically fall back to Uniswap V2
- Check logs for "Falling back to Uniswap V2..."

### Transaction Failures
- Check gas price settings
- Verify token approvals
- Ensure sufficient token balances

---

## 10. Test Scripts Created

1. **create-delegator.ts** - DeleGator setup (simplified for testing)
2. **setup-e2e-test.ts** - Database initialization
3. **E2E-TEST-SUMMARY.md** - This document

---

## 11. Next Steps

✅ **Ready for E2E Testing!**

Run the backend and bot, then monitor for automatic rebalancing.

### After Successful Test

1. Verify final portfolio allocation is close to 50/50
2. Check rebalance transaction on Monad explorer
3. Review bot logs for any errors or warnings
4. Test Monorail → Uniswap V2 fallback by temporarily disabling Monorail

### Production Considerations

- [ ] Replace test private keys with secure key management
- [ ] Implement proper DeleGator creation via MetaMask SDK
- [ ] Add comprehensive error handling and retry logic
- [ ] Set up monitoring and alerting
- [ ] Configure production gas price strategies
- [ ] Enable MEV protection features

---

**Test Environment Ready!** 🚀

All systems operational. Execute `npm run start:dev` in both terminals to begin E2E test.

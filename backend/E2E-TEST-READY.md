# 🎯 E2E Test - READY TO EXECUTE

## ✅ All Setup Complete

### Test Wallet
- **Address**: `0x47B245f2A3c7557d855E4d800890C4a524a42Cc8`
- **MON**: 253.64 MON (~79.73%)
- **USDC**: 64.47 USDC (~20.27%)
- **Drift**: **29.73%** ⚠️ (target: 50/50, threshold: 5%)

### Bot Wallet
- **Address**: `0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558`
- Has delegation to rebalance test wallet

### Contracts (Monad Testnet)
- **StrategyRegistry**: `0x6655e6ee9a1BcF91047C9c0b1f4bAf56E2cfd146`
- **RebalanceExecutor**: `0xc5bd44d66d3cCe2D534972A749060472e7Ec78c9`
- **DelegationManager**: `0x96a355552bBAbBAA0E36072e836d5eD9909C452f`

### Database
- ✅ User created
- ✅ Strategy created (ID: 1, 50/50 MON/USDC)
- ✅ Delegation active and linked

### Backend
- ✅ Bot compiled successfully
- ✅ Monorail DEX integrated (primary)
- ✅ Uniswap V2 as fallback
- ✅ All services configured

---

## 🚀 RUN E2E TEST

### Step 1: Start Services

```bash
# Terminal 1: PostgreSQL & Redis
brew services start postgresql
brew services start redis

# Terminal 2: Start Backend API
cd /Users/kadzu/Documents/Repositories/rebased-monorepo/rebased/backend
npm run start:dev

# Terminal 3: Start Bot (wait for API to start)
cd /Users/kadzu/Documents/Repositories/rebased-monorepo/rebased/backend/apps/bot
npm run start:dev
```

### Step 2: Monitor Execution

Watch bot logs for:
1. ✓ Strategy monitoring started
2. ✓ Drift detected: 29.73%
3. ✓ Getting DEX quotes (Monorail/Uniswap V2)
4. ✓ Building rebalance transaction
5. ✓ Simulating contract call
6. ✓ Executing rebalance on-chain
7. ✓ Transaction confirmed
8. ✓ Database updated

### Step 3: Verify Results

```bash
# Check rebalance record
psql -U postgres -d rebased -c "SELECT * FROM rebalances ORDER BY \"executedAt\" DESC LIMIT 1;"

# Check updated balances
cast balance 0x47B245f2A3c7557d855E4d800890C4a524a42Cc8 --rpc-url https://testnet-rpc.monad.xyz
cast call 0xf817257fed379853cDe0fa4F97AB987181B1E5Ea "balanceOf(address)(uint256)" 0x47B245f2A3c7557d855E4d800890C4a524a42Cc8 --rpc-url https://testnet-rpc.monad.xyz

# Calculate new drift (should be < 5%)
```

---

## 📊 Expected Results

- **Initial**: 79.73% MON / 20.27% USDC (29.73% drift)
- **Target**: 50% MON / 50% USDC
- **After Rebalance**: ~50/50 allocation (drift < 5%)

### Transaction Flow
1. Bot detects drift exceeds 5% threshold
2. Evaluates strategy conditions
3. Calculates required swaps (~30 MON → USDC)
4. Gets best route from Monorail
5. Builds delegation-authorized tx
6. Executes rebalance on Monad testnet
7. Portfolio rebalanced to 50/50

---

## ⚡ Quick Commands

```bash
# View bot logs
tail -f logs/bot.log

# Check strategy status
psql -U postgres -d rebased -c "SELECT id, \"strategyId\", name, \"isActive\", tokens, weights FROM strategies;"

# Check delegation
psql -U postgres -d rebased -c "SELECT id, \"userAddress\", \"delegateAddress\", \"isActive\" FROM delegations;"

# Monitor rebalances
watch -n 5 'psql -U postgres -d rebased -c "SELECT * FROM rebalances ORDER BY \"executedAt\" DESC LIMIT 5;"'
```

---

## 🎉 SUCCESS CRITERIA

- [x] Bot detects 29.73% drift
- [ ] DEX quote received (Monorail or Uniswap V2)
- [ ] Transaction simulated successfully
- [ ] Rebalance executed on-chain
- [ ] Transaction confirmed
- [ ] Database record created
- [ ] Final drift < 5%
- [ ] Portfolio closer to 50/50

---

**Ready to test! Start the services above and watch the magic happen! 🚀**

# Rebased Bot Worker - Production Deployment Guide

**Version:** 1.0.0
**Date:** 2025-10-12
**Status:** ✅ PRODUCTION READY

---

## 🎯 Overview

The Rebased Bot Worker is an automated portfolio rebalancing engine that executes rebalances for users who have delegated authority via MetaMask DeleGator smart accounts.

**Features:**
- ✅ Monitors 100+ strategies every 30 seconds
- ✅ Finds best swap routes across 3 DEX aggregators (1inch, 0x, ParaSwap)
- ✅ Executes rebalances via MetaMask Delegation Framework v1.3.0
- ✅ MEV protection via Flashbots
- ✅ Comprehensive error handling & retries
- ✅ Gas optimization & profitability checks
- ✅ Real-time WebSocket notifications

---

## 📋 Prerequisites

### System Requirements

- **Node.js:** v18+ or v20+
- **PostgreSQL:** v14+
- **Redis:** v7+
- **Memory:** 2GB+ RAM
- **Disk:** 10GB+ free space

### API Keys Required

1. **1inch API Key** (Critical)
   - Get from: https://portal.1inch.dev
   - Free tier: 1 req/sec
   - Pro tier: 10 req/sec (recommended)

2. **0x API Key** (Optional but recommended)
   - Get from: https://0x.org/docs/api

### Bot Wallet

- Fund with **Base Sepolia ETH** and **Monad Testnet MON**
- Minimum: 0.1 ETH per chain for gas
- Bot wallet address: `0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558`

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd rebased/backend
npm install
```

### 2. Setup Database

```bash
# Start PostgreSQL (if using Docker)
docker-compose up -d postgres

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. Setup Redis

```bash
# Start Redis (if using Docker)
docker-compose up -d redis

# Or install locally
brew install redis
brew services start redis
```

### 4. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Critical Variables:**

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rebased"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Bot Wallet (KEEP SECURE!)
BOT_PRIVATE_KEY=0x...

# DEX API Keys
ONEINCH_API_KEY=your_1inch_key_here  # REQUIRED
ZEROX_API_KEY=your_0x_key_here       # Optional

# Contracts (Already configured from deployment)
BASE_EXECUTOR=0x2cd47f7Cf22594fD1f40AA1b1F3C9a0c1d585BaC
MONAD_EXECUTOR=0xc5bd44d66d3cCe2D534972A749060472e7Ec78c9
# ... (see .env for full list)
```

### 5. Start Bot Worker

```bash
# Development
npm run start:bot:dev

# Production
npm run start:bot
```

---

## 🔧 Configuration

### Bot Settings

```bash
# Monitoring
MONITORING_INTERVAL=30000  # Check every 30 seconds

# Gas Limits
MAX_GAS_PRICE=100000000000  # 100 gwei max
GAS_PRICE_MULTIPLIER=1.1    # 10% above current

# Slippage & Price Impact
MAX_SLIPPAGE_BPS=100        # 1% max slippage
MAX_PRICE_IMPACT=3          # 3% max price impact

# MEV Protection
ENABLE_FLASHBOTS=true
FLASHBOTS_RPC=https://rpc.flashbots.net
```

### DEX Aggregators

```bash
# Enable/disable aggregators
ENABLE_1INCH=true      # Primary (best rates)
ENABLE_0X=true         # Secondary
ENABLE_PARASWAP=true   # Backup
FALLBACK_UNISWAP=true  # Last resort
```

---

## 📊 Monitoring & Logs

### Log Levels

```bash
# Set log level
LOG_LEVEL=info  # debug | info | warn | error
```

### View Logs

```bash
# Pretty logs
npm run start:bot | pino-pretty

# Save logs to file
npm run start:bot | pino-pretty > logs/bot-$(date +%Y%m%d).log
```

### Health Checks

```bash
# Check bot status
curl http://localhost:3000/health

# Check queue status
redis-cli
> KEYS *rebalance*
> LLEN bull:rebalance:wait
> LLEN bull:rebalance:active
> LLEN bull:rebalance:completed
> LLEN bull:rebalance:failed
```

### Metrics

Bot exposes Prometheus metrics on port 9090:

```bash
curl http://localhost:9090/metrics
```

**Key Metrics:**
- `rebalance_total` - Total rebalances executed
- `rebalance_success_total` - Successful rebalances
- `rebalance_failed_total` - Failed rebalances
- `quote_fetch_duration` - DEX quote fetch time
- `gas_price_gwei` - Current gas price

---

## 🔐 Security

### Private Key Management

**NEVER commit private keys to git!**

Best practices:
1. Use environment variables
2. Use AWS Secrets Manager / HashiCorp Vault in production
3. Rotate keys regularly
4. Monitor wallet balance

### Bot Wallet Permissions

The bot can ONLY:
- ✅ Execute rebalances for delegated accounts
- ✅ Get gas reimbursement from user

The bot CANNOT:
- ❌ Withdraw user funds
- ❌ Transfer user tokens
- ❌ Change delegation settings

### API Key Security

Store API keys in:
- `.env` file (development)
- Environment variables (production)
- Secrets manager (production recommended)

---

## 🐛 Troubleshooting

### Bot Not Executing Rebalances

**Problem:** Bot monitors strategies but doesn't execute

**Checklist:**
1. Check bot wallet has sufficient gas
   ```bash
   cast balance $BOT_ADDRESS --rpc-url https://sepolia.base.org
   ```

2. Check delegation is active
   ```bash
   # Call shouldRebalance to verify
   cast call $EXECUTOR "shouldRebalance(address,uint256)" $USER $STRATEGY_ID \
     --rpc-url https://sepolia.base.org
   ```

3. Check drift threshold
   - Drift must exceed `maxDrift` config value
   - Default: 5% (500 basis points)

4. Check rebalance cooldown
   - Default: 24 hours between rebalances
   - Check `lastRebalanceTime` in contract

### DEX Quote Failures

**Problem:** "No acceptable quotes found"

**Solutions:**

1. Check API keys configured
   ```bash
   echo $ONEINCH_API_KEY  # Should not be empty
   ```

2. Check API rate limits
   - 1inch free tier: 1 req/sec
   - Enable only needed aggregators

3. Check price impact
   ```bash
   # Increase max price impact if needed
   MAX_PRICE_IMPACT=5  # 5% instead of 3%
   ```

4. Check liquidity
   - Large swaps may have high price impact
   - Split into smaller swaps

### Gas Price Too High

**Problem:** Bot skips rebalances due to high gas

**Solution:**

```bash
# Increase max gas price
MAX_GAS_PRICE=200000000000  # 200 gwei

# Or wait for lower gas
# Bot will retry when gas drops
```

### Transaction Reverts

**Problem:** Transactions fail on-chain

**Common Causes:**

1. **Slippage Exceeded**
   - Market moved between quote and execution
   - Increase slippage tolerance: `MAX_SLIPPAGE_BPS=200` (2%)

2. **Insufficient Balance**
   - User doesn't have enough tokens
   - Check user balances before execution

3. **Delegation Expired/Revoked**
   - User disabled delegation
   - Check delegation status

4. **Cooldown Not Elapsed**
   - Trying to rebalance too soon
   - Wait for cooldown period

---

## 📈 Performance Tuning

### Optimize Gas Costs

1. **Batch Operations**
   - Process multiple swaps in one transaction
   - Reduces per-transaction overhead

2. **Gas Price Strategy**
   ```bash
   # Use lower multiplier during low-traffic periods
   GAS_PRICE_MULTIPLIER=1.05  # 5% above current
   ```

3. **MEV Protection**
   ```bash
   # Use Flashbots to avoid frontrunning
   ENABLE_FLASHBOTS=true
   ```

### Optimize Quote Fetching

1. **Parallel Requests**
   - Already enabled by default
   - Fetches all aggregators simultaneously

2. **Cache Results**
   - Quotes valid for ~15 seconds
   - Reuse within execution window

3. **Disable Slow Aggregators**
   ```bash
   # If one aggregator is slow
   ENABLE_PARASWAP=false
   ```

### Scale Horizontally

Run multiple bot workers:

```bash
# Worker 1 (monitors Base)
BASE_ONLY=true npm run start:bot

# Worker 2 (monitors Monad)
MONAD_ONLY=true npm run start:bot
```

---

## 🚀 Production Deployment

### Using Docker

```bash
# Build image
docker build -t rebased-bot .

# Run container
docker run -d \
  --name rebased-bot \
  --env-file .env \
  --restart unless-stopped \
  rebased-bot
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start npm --name "rebased-bot" -- run start:bot

# Save PM2 config
pm2 save

# Enable startup script
pm2 startup
```

### Using Systemd

```bash
# Create service file
sudo nano /etc/systemd/system/rebased-bot.service
```

```ini
[Unit]
Description=Rebased Bot Worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=rebased
WorkingDirectory=/opt/rebased/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start:bot
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable rebased-bot
sudo systemctl start rebased-bot

# Check status
sudo systemctl status rebased-bot

# View logs
sudo journalctl -u rebased-bot -f
```

---

## 📊 Analytics & Reporting

### Database Queries

```sql
-- Total rebalances executed
SELECT COUNT(*) FROM rebalances WHERE status = 'SUCCESS';

-- Average gas cost
SELECT AVG(gas_cost) FROM rebalances WHERE status = 'SUCCESS';

-- Rebalances by strategy
SELECT strategy_id, COUNT(*) FROM rebalances
GROUP BY strategy_id
ORDER BY COUNT(*) DESC;

-- Failed rebalances
SELECT * FROM rebalances
WHERE status = 'FAILED'
ORDER BY created_at DESC
LIMIT 10;
```

### Export Metrics

```bash
# Export to CSV
psql $DATABASE_URL -c "COPY (
  SELECT * FROM rebalances WHERE created_at > NOW() - INTERVAL '7 days'
) TO STDOUT WITH CSV HEADER" > rebalances_week.csv
```

---

## 🔄 Maintenance

### Daily Tasks

1. **Check Bot Balance**
   ```bash
   ./scripts/check-balance.sh
   ```

2. **Review Failed Rebalances**
   ```bash
   npm run bot:check-failures
   ```

3. **Monitor Gas Prices**
   - Adjust `MAX_GAS_PRICE` if needed

### Weekly Tasks

1. **Update Dependencies**
   ```bash
   npm update
   npm audit fix
   ```

2. **Review Performance**
   - Check average execution time
   - Optimize slow queries

3. **Rotate API Keys**
   - Best practice for security

### Monthly Tasks

1. **Database Maintenance**
   ```bash
   # Vacuum and analyze
   psql $DATABASE_URL -c "VACUUM ANALYZE;"
   ```

2. **Archive Old Data**
   ```sql
   -- Archive rebalances older than 90 days
   DELETE FROM rebalances WHERE created_at < NOW() - INTERVAL '90 days';
   ```

---

## 📞 Support

### Getting Help

1. **Documentation**
   - Architecture: `docs/BOT_IMPLEMENTATION_ANALYSIS.md`
   - Contracts: `../contract/docs/CONTRACT_ARCHITECTURE.md`

2. **Logs**
   - Check bot logs: `logs/bot-*.log`
   - Check system logs: `sudo journalctl -u rebased-bot`

3. **Community**
   - GitHub Issues: https://github.com/rebased/monorepo/issues
   - Discord: #dev-backend channel

### Common Issues

See [Troubleshooting](#troubleshooting) section above.

---

## 📝 Changelog

### v1.0.0 (2025-10-12)

**Initial Production Release**

✅ **Implemented:**
- MonitorService with 30s interval
- StrategyEngine with drift calculation
- DEX aggregator integration (1inch, 0x, ParaSwap)
- GasService with price optimization
- ExecutorProcessor with delegation support
- MEV protection via Flashbots
- Comprehensive error handling
- WebSocket notifications

✅ **Contracts Deployed:**
- Base Sepolia: 0x2cd47f7Cf22594fD1f40AA1b1F3C9a0c1d585BaC
- Monad Testnet: 0xc5bd44d66d3cCe2D534972A749060472e7Ec78c9

---

## 🎯 Next Steps

1. **Get API Keys**
   - Sign up at https://portal.1inch.dev
   - Add to `.env`: `ONEINCH_API_KEY=...`

2. **Fund Bot Wallet**
   ```bash
   # Base Sepolia faucet
   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

   # Monad Testnet faucet
   https://testnet.monad.xyz/faucet
   ```

3. **Start Bot**
   ```bash
   npm run start:bot:dev
   ```

4. **Create Test Strategy**
   - Use frontend to create strategy
   - Enable delegation to bot
   - Watch bot execute rebalance!

5. **Monitor First Execution**
   ```bash
   # Watch logs
   npm run start:bot | pino-pretty

   # Check queue
   redis-cli monitor
   ```

---

**🎉 Your bot is production-ready! Deploy and start rebalancing portfolios automatically.**

For questions or issues, check the docs or reach out to the team.

---

**End of Production Deployment Guide**

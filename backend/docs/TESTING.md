# Rebased Backend - Testing Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7
- MetaMask wallet with testnet ETH

## Initial Setup

### 1. Install Dependencies

```bash
cd rebased/backend
npm install
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Required for basic testing
DATABASE_URL="postgresql://rebased:rebased_dev@localhost:5432/rebased"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
BOT_PRIVATE_KEY=0x1234... # Bot wallet private key
MONAD_RPC_URL=https://testnet.monad.xyz
BASE_RPC_URL=https://sepolia.base.org

# Contract addresses (deploy contracts first)
MONAD_STRATEGY_REGISTRY=0x...
MONAD_DELEGATION_MANAGER=0x...
MONAD_DELEGATE_EXECUTOR=0x...
BASE_STRATEGY_REGISTRY=0x...
BASE_DELEGATION_MANAGER=0x...
BASE_DELEGATE_EXECUTOR=0x...
```

### 4. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
docker-compose logs -f postgres redis
```

### 5. Run Database Migrations

```bash
npm run prisma:migrate
```

---

## Testing Each Component

### Test 1: API Server Authentication (SIWE)

**Start the API server:**

```bash
npm run start:api
```

**Test nonce generation:**

```bash
curl -X POST http://localhost:3000/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

**Expected response:**

```json
{
  "nonce": "1234567890abcdef"
}
```

**Test SIWE verification (use MetaMask to sign):**

1. Create SIWE message with the nonce:

```
localhost:3000 wants you to sign in with your Ethereum account:
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

Sign in to Rebased

URI: http://localhost:3000
Version: 1
Chain ID: 1
Nonce: 1234567890abcdef
Issued At: 2024-01-01T00:00:00.000Z
```

2. Sign with MetaMask

3. Verify signature:

```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "localhost:3000 wants you to sign...",
    "signature": "0xabc..."
  }'
```

**Expected response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "expiresAt": 1704153600000
}
```

**✅ Success Criteria:**

- Nonce is generated and stored in database
- Valid signature returns JWT token
- Invalid signature returns 401 error
- Reusing nonce fails (replay protection)

---

### Test 2: Create Strategy

**Use JWT from Test 1:**

```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X POST http://localhost:3000/strategies \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 10143,
    "tokens": [
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    ],
    "weights": [5000, 5000],
    "rebalanceInterval": 86400
  }'
```

**Expected response:**

```json
{
  "id": "abc-123-def-456",
  "chainId": 10143,
  "strategyId": "1704067200000",
  "userAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "tokens": [
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  ],
  "weights": [5000, 5000],
  "rebalanceInterval": "86400",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Verify in database:**

```bash
npm run prisma:studio
# Open http://localhost:5555
# Navigate to Strategy model
# Verify record exists
```

**✅ Success Criteria:**

- Strategy created in database
- Weights sum to 10000 (100%)
- Tokens array matches weights array length
- `strategy:created` event published to Redis

---

### Test 3: Create Delegation (ERC-7710)

**Generate EIP-712 signature (use frontend or ethers.js):**

```javascript
const domain = {
  name: "Rebased DelegationManager",
  version: "1",
  chainId: 10143,
  verifyingContract: "0xYourDelegationManagerAddress",
};

const types = {
  Delegation: [
    { name: "delegate", type: "address" },
    { name: "authority", type: "bytes32" },
    { name: "caveats", type: "Caveat[]" },
    { name: "salt", type: "uint256" },
  ],
  Caveat: [
    { name: "enforcer", type: "address" },
    { name: "terms", type: "bytes" },
  ],
};

const message = {
  delegate: "0xBotAddress",
  authority: ethers.keccak256(ethers.toUtf8Bytes("REBALANCE_AUTHORITY")),
  caveats: [],
  salt: BigInt(Date.now()),
};

const signature = await signer.signTypedData(domain, types, message);
```

**Submit delegation:**

```bash
curl -X POST http://localhost:3000/delegations \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 10143,
    "strategyId": "abc-123-def-456",
    "delegateAddress": "0xBotAddress",
    "delegationData": {
      "delegate": "0xBotAddress",
      "authority": "0x...",
      "caveats": [],
      "salt": 1704067200
    },
    "signature": "0xabc..."
  }'
```

**Expected response:**

```json
{
  "id": "delegation-hash-123",
  "chainId": 10143,
  "strategyId": "abc-123-def-456",
  "userAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "delegateAddress": "0xbotaddress",
  "delegationData": { ... },
  "signature": "0xabc...",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**✅ Success Criteria:**

- Delegation created in database
- Signature verification succeeds
- Strategy belongs to authenticated user
- `delegation:created` event published to Redis

---

### Test 4: Bot Worker Monitoring

**Start the bot worker:**

```bash
npm run start:bot
```

**Expected console output:**

```
🤖 Bot Worker started successfully
📊 Monitor service: Active
⚙️  Executor queue: Listening
🔄 DEX aggregators: Ready
⛽ Gas oracle: Monitoring
🛡️  MEV protection: Enabled
```

**Monitor logs:**

```bash
# Should see monitoring cycles every 30 seconds
[Bot] Starting strategy monitoring cycle
[Bot] Monitoring 1 active strategies
[Bot] Monitoring cycle completed
```

**Check gas oracle:**

```bash
# Gas prices should be updated every 10 seconds
[GasService] Gas price for monad: 10000000000 (1.1x)
[GasService] Gas price for base: 15000000000 (1.1x)
```

**Verify gas prices in database:**

```sql
SELECT * FROM "GasPrice" ORDER BY timestamp DESC LIMIT 10;
```

**✅ Success Criteria:**

- Bot starts without errors
- Monitoring cron runs every 30 seconds
- Gas oracle updates every 10 seconds
- Health check runs every 5 minutes
- Gas prices saved to database

---

### Test 5: Bull Queue Monitoring (Bull Board)

**Access Bull Board:**

```bash
# Start Bull Board (already in docker-compose)
open http://localhost:3001
```

**Queue Statistics:**

- Rebalance queue: 0 active, 0 waiting, 0 completed
- Indexer queue: 0 active, 0 waiting, 0 completed
- Analytics queue: 0 active, 0 waiting, 0 completed

**Manually queue a rebalance job (for testing):**

```javascript
// In a Node.js REPL or script
const Queue = require("bull");
const queue = new Queue("rebalance", {
  redis: { host: "localhost", port: 6379 },
});

await queue.add("execute-rebalance", {
  strategyId: "abc-123-def-456",
  userAddress: "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  chainId: 10143,
  drift: 650,
  priority: "high",
});
```

**Check Bull Board:**

- Job should appear in "Waiting" queue
- Bot should pick it up and move to "Active"
- If gas price is acceptable, job completes
- Job moves to "Completed" or "Failed"

**✅ Success Criteria:**

- Bull Board accessible at :3001
- Jobs appear in queues
- Bot processes jobs from queue
- Job status updates in real-time

---

### Test 6: Indexer Worker

**Start the indexer worker:**

```bash
npm run start:indexer
```

**Expected console output:**

```
📡 Indexer Worker started successfully
🔗 Monad listener: Active
🔗 Base listener: Active
⚙️  Event processors: Ready
📊 Backfill service: Standby
```

**Monitor logs:**

```bash
# Should see block polling every 3 seconds
[ChainListenerService] monad current block: 123456
[ChainListenerService] base current block: 789012
```

**Test backfill (if contracts deployed):**

```javascript
// Access backfill service via API or script
const {
  BackfillService,
} = require("./apps/indexer/src/backfill/backfill.service");

await backfillService.backfillChain("monad", 100000n, 100100n);
```

**Check indexed events in database:**

```sql
SELECT * FROM "Rebalance" ORDER BY "createdAt" DESC;
```

**✅ Success Criteria:**

- Indexer starts without errors
- Listens to both Monad and Base chains
- Polls blocks every 3 seconds
- Events queued for processing
- Database updated with indexed events

---

### Test 7: WebSocket Real-Time Updates

**Connect with Socket.IO client:**

```javascript
const io = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to WebSocket");

  // Join user-specific room
  socket.emit("join", { address: "0x742d35cc6634c0532925a3b844bc9e7595f0beb" });
});

socket.on("rebalance:started", (data) => {
  console.log("Rebalance started:", data);
});

socket.on("rebalance:completed", (data) => {
  console.log("Rebalance completed:", data);
});

socket.on("system:message", (data) => {
  console.log("System message:", data);
});
```

**Trigger rebalance (manually via Bull Board or bot):**

Expected WebSocket events:

```json
// Event 1
{
  "strategyId": "abc-123-def-456",
  "drift": 6.5,
  "timestamp": "2024-01-01T00:00:00Z"
}

// Event 2
{
  "strategyId": "abc-123-def-456",
  "txHash": "0x123abc...",
  "gasUsed": "250000",
  "success": true,
  "timestamp": "2024-01-01T00:01:00Z"
}
```

**✅ Success Criteria:**

- Socket.IO connection establishes
- User joins personal room
- Real-time events received
- Events are user-specific (no leakage)

---

### Test 8: Redis Pub/Sub Inter-Service Communication

**Monitor Redis pub/sub:**

```bash
docker exec -it rebased-redis redis-cli

# Subscribe to all channels
PSUBSCRIBE *
```

**Trigger events and watch pub/sub:**

1. Create strategy → See `strategy:created` event
2. Create delegation → See `delegation:created` event
3. Bot queues rebalance → See `rebalance:queued` event
4. Bot executes rebalance → See `rebalance:completed` event

**Example pub/sub message:**

```
1) "pmessage"
2) "*"
3) "strategy:created"
4) "{\"timestamp\":\"2024-01-01T00:00:00.000Z\",\"source\":\"api\",\"strategyId\":\"abc-123\",\"userAddress\":\"0x...\",\"chainId\":10143,\"tokens\":[],\"weights\":[]}"
```

**✅ Success Criteria:**

- All services publish to Redis
- Events are JSON-formatted
- Multiple services can subscribe
- No message loss

---

### Test 9: End-to-End Rebalance Flow

**Prerequisites:**

- Contracts deployed to testnet
- Bot wallet funded with ETH
- DEX API keys configured
- User strategy with active delegation

**Steps:**

1. **Create strategy** (Test 2)
2. **Create delegation** (Test 3)
3. **Wait for bot to detect drift**
4. **Bot queues rebalance job**
5. **Bot executes rebalance**
6. **Indexer picks up event**
7. **User receives WebSocket notification**

**Timeline:**

```
T+0s    : User creates strategy
T+0s    : User creates delegation
T+30s   : Bot monitors strategy (first cycle)
T+60s   : Bot detects drift > threshold
T+60s   : Bot adds job to Bull queue
T+61s   : Executor processor starts job
T+61s   : Gas oracle checks gas price
T+62s   : DEX service gets swap quotes
T+65s   : MEV service protects transaction
T+66s   : Transaction sent to blockchain
T+90s   : Transaction confirmed (1 block)
T+90s   : Database updated (rebalance record)
T+90s   : WebSocket event sent to user
T+93s   : Indexer picks up RebalanceExecuted event
T+93s   : Indexer updates analytics
```

**Verify in database:**

```sql
-- Check strategy
SELECT * FROM "Strategy" WHERE id = 'abc-123-def-456';

-- Check delegation
SELECT * FROM "Delegation" WHERE "strategyId" = 'abc-123-def-456';

-- Check rebalance
SELECT * FROM "Rebalance" WHERE "strategyId" = 'abc-123-def-456' ORDER BY "createdAt" DESC;

-- Check gas prices
SELECT * FROM "GasPrice" WHERE "chainId" = 10143 ORDER BY timestamp DESC LIMIT 10;
```

**✅ Success Criteria:**

- Complete flow executes without errors
- Transaction confirmed on-chain
- Database records created
- User receives real-time updates
- Analytics updated

---

## Debugging & Troubleshooting

### Check Service Logs

```bash
# API logs
npm run start:api 2>&1 | tee api.log

# Bot logs
npm run start:bot 2>&1 | tee bot.log

# Indexer logs
npm run start:indexer 2>&1 | tee indexer.log
```

### Check Database Connections

```bash
docker exec -it rebased-postgres psql -U rebased -d rebased

\dt          # List tables
\d "User"    # Describe User table
SELECT COUNT(*) FROM "Strategy";
```

### Check Redis

```bash
docker exec -it rebased-redis redis-cli

PING              # Should return PONG
KEYS *            # List all keys
LLEN bull:rebalance:wait  # Queue length
```

### Check Bull Queue Health

```bash
curl http://localhost:3001/api/queues
```

### Common Issues

**Issue: "Port 3000 already in use"**

```bash
lsof -ti:3000 | xargs kill -9
```

**Issue: "Connection refused to PostgreSQL"**

```bash
docker-compose restart postgres
docker-compose logs postgres
```

**Issue: "Redis connection failed"**

```bash
docker-compose restart redis
docker-compose logs redis
```

**Issue: "Prisma Client not generated"**

```bash
npm run prisma:generate
```

**Issue: "Invalid signature" during SIWE**

- Check nonce is fresh
- Verify message format matches SIWE spec
- Ensure chainId matches

**Issue: "Strategy not found" during delegation**

- Verify strategy exists: `SELECT * FROM "Strategy" WHERE id = '...'`
- Check user owns strategy

**Issue: "Bot not executing rebalances"**

- Check gas prices (may be too high)
- Verify delegation is active
- Check drift threshold configuration
- Review bot logs for errors

---

## Performance Testing

### Load Test API

```bash
# Install Apache Bench
brew install ab  # macOS
apt-get install apache2-utils  # Linux

# Test authentication endpoint
ab -n 1000 -c 10 -T application/json http://localhost:3000/health

# Test strategies endpoint (with auth)
ab -n 100 -c 5 -H "Authorization: Bearer $JWT_TOKEN" http://localhost:3000/strategies
```

### Stress Test Bot

```bash
# Create 100 strategies
for i in {1..100}; do
  curl -X POST http://localhost:3000/strategies \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"chainId\":10143,\"tokens\":[\"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984\",\"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2\"],\"weights\":[5000,5000],\"rebalanceInterval\":86400}"
done

# Monitor bot CPU/memory
docker stats rebased-bot
```

---

## Security Testing

### Test SIWE Replay Attack Protection

```bash
# Get nonce
NONCE=$(curl -X POST http://localhost:3000/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}' | jq -r '.nonce')

# Sign message (use MetaMask)
# Try to verify twice with same signature
# Second attempt should fail with 401
```

### Test JWT Expiration

```bash
# Get JWT with short expiration
# Edit JWT_EXPIRES_IN=1s in .env
# Restart API server
# Get token
# Wait 2 seconds
# Try to use expired token
# Should get 401 Unauthorized
```

### Test Delegation Signature Verification

```bash
# Try to submit delegation with invalid signature
curl -X POST http://localhost:3000/delegations \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 10143,
    "strategyId": "abc-123",
    "delegateAddress": "0xBot",
    "delegationData": {...},
    "signature": "0xinvalid"
  }'

# Should get 400 Bad Request: Invalid signature
```

---

## CI/CD Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:e2e
```

### Coverage Report

```bash
npm run test:cov
open coverage/lcov-report/index.html
```

---

## Production Readiness Checklist

- [ ] All smart contracts deployed and verified
- [ ] Contract ABIs added to codebase
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis configured with persistence
- [ ] Bot wallet funded with gas
- [ ] DEX API keys active
- [ ] Flashbots RPC configured
- [ ] Health checks passing
- [ ] WebSocket connections stable
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Monitoring dashboards setup
- [ ] Alert webhooks configured
- [ ] Backup strategy in place
- [ ] Disaster recovery plan documented

---

## Next Steps

After completing all tests:

1. **Deploy to Testnet**: Use Docker Compose with testnet RPC URLs
2. **Monitor for 24 Hours**: Ensure stability and no errors
3. **Perform Security Audit**: Hire external auditor for smart contracts
4. **Setup Monitoring**: Prometheus + Grafana dashboards
5. **Configure Alerts**: Discord/Telegram webhooks for critical errors
6. **Document Operations**: Runbooks for common issues
7. **Mainnet Deployment**: Only after thorough testing and audit

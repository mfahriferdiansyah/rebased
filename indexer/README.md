# Rebased Ponder Indexer

Multi-chain blockchain indexer for Rebased with comprehensive relational database design and GraphQL API.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              PONDER INDEXER                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │ Monad        │         │ Base Sepolia │            │
│  │ Chain 10143  │         │ Chain 84532  │            │
│  └──────┬───────┘         └──────┬───────┘            │
│         │                         │                     │
│         └─────────┬───────────────┘                     │
│                   │                                     │
│         ┌─────────▼─────────┐                          │
│         │  Event Listeners  │                          │
│         │  - StrategyRegistry                          │
│         │  - RebalanceExecutor                         │
│         └─────────┬─────────┘                          │
│                   │                                     │
│         ┌─────────▼─────────┐                          │
│         │  Event Handlers   │                          │
│         │  - Process events                            │
│         │  - Update database                           │
│         └─────────┬─────────┘                          │
│                   │                                     │
│         ┌─────────▼─────────┐                          │
│         │  PostgreSQL       │                          │
│         │  Relational DB    │                          │
│         │  - Users          │                          │
│         │  - Strategies     │                          │
│         │  - Rebalances     │                          │
│         │  - Swaps          │                          │
│         │  - Daily Stats    │                          │
│         └─────────┬─────────┘                          │
│                   │                                     │
│         ┌─────────▼─────────┐                          │
│         │  GraphQL API      │                          │
│         │  Port 42069       │                          │
│         └───────────────────┘                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📊 Database Schema (Relational)

### Core Entities

```
User (Portfolio Owner)
├── id: address (PK)
├── strategyCount
├── totalRebalances
├── totalVolumeUSD
├── totalGasSpentWei
├── firstSeenAt
└── lastActivityAt

Strategy (Rebalancing Strategy)
├── id: string (PK) = {chainId}-{userAddress}-{strategyId}
├── chainId
├── strategyId
├── userId (FK → User)
├── name
├── tokens: address[]
├── weights: int[]
├── rebalanceInterval
├── isActive
├── isPaused
├── lastRebalanceTime
├── totalRebalances
├── totalSwaps
├── totalVolumeUSD
├── totalGasSpentWei
├── averageDrift
├── createdAt
└── updatedAt

Rebalance (Execution Record)
├── id: string (PK) = {txHash}-{logIndex}
├── strategyId (FK → Strategy)
├── txHash
├── blockNumber
├── blockTimestamp
├── drift
├── driftPercentage
├── gasReimbursed
├── gasPrice
├── status: SUCCESS | FAILED
├── failureReason (optional)
├── totalSwaps
├── totalVolumeIn
├── totalVolumeOut
└── averagePriceImpact

Swap (Token Swap)
├── id: string (PK) = {txHash}-{logIndex}-{swapIndex}
├── rebalanceId (FK → Rebalance)
├── tokenIn
├── tokenOut
├── amountIn
├── amountOut
├── priceImpact
├── txHash
├── blockTimestamp
└── logIndex

DailyStats (Aggregated Metrics)
├── id: string (PK) = {chainId}-{YYYY-MM-DD}
├── chainId
├── date
├── totalRebalances
├── totalSwaps
├── totalVolumeUSD
├── totalGasSpentWei
├── uniqueUsers
├── activeStrategies
├── averageDrift
└── averagePriceImpact

SystemEvent (Platform Events)
├── id: string (PK) = {txHash}-{logIndex}
├── chainId
├── type: DEX_APPROVAL | EMERGENCY_PAUSE | etc.
├── dexAddress (optional)
├── approved (optional)
├── pausedBy (optional)
├── txHash
├── blockNumber
├── blockTimestamp
└── logIndex
```

### Relationships

- User → Strategy (1:many)
- Strategy → Rebalance (1:many)
- Rebalance → Swap (1:many)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Deployed smart contracts on Monad + Base Sepolia

### Installation

```bash
cd rebased/indexer

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your values
```

### Configuration

Edit `.env.local`:

```bash
# PostgreSQL connection
PONDER_DATABASE_URL="postgresql://user:password@localhost:5432/ponder"

# RPC URLs
PONDER_RPC_URL_MONAD="https://testnet.monad.xyz"
PONDER_RPC_URL_BASE="https://sepolia.base.org"

# Monad Contract Addresses
MONAD_STRATEGY_REGISTRY="0x..."
MONAD_REBALANCE_EXECUTOR="0x..."

# Base Sepolia Contract Addresses
BASE_STRATEGY_REGISTRY="0x..."
BASE_REBALANCE_EXECUTOR="0x..."

# Optional: Start blocks for faster initial sync
MONAD_START_BLOCK="0"
BASE_START_BLOCK="0"
```

### Development

```bash
# Start development server (with hot reload)
npm run dev

# GraphQL playground will be available at:
# http://localhost:42069
```

### Production

```bash
# Generate types
npm run codegen

# Build
npm run build

# Start production server
npm run start
```

## 📡 GraphQL API

### Access GraphQL Playground

```
http://localhost:42069
```

### Example Queries

**Get user with strategies:**

```graphql
query GetUser {
  user(id: "0x742d35cc6634c0532925a3b844bc9e7595f0beb") {
    id
    strategyCount
    totalRebalances
    totalVolumeUSD
    strategies {
      id
      name
      tokens
      weights
      isActive
      totalRebalances
      averageDrift
    }
  }
}
```

**Get strategy with rebalances:**

```graphql
query GetStrategy {
  strategy(id: "10143-0x742d35cc6634c0532925a3b844bc9e7595f0beb-1") {
    id
    name
    tokens
    weights
    rebalanceInterval
    isActive
    totalRebalances
    rebalances(orderBy: "blockTimestamp", orderDirection: "desc", limit: 10) {
      id
      drift
      driftPercentage
      gasReimbursed
      status
      blockTimestamp
      totalSwaps
      swaps {
        tokenIn
        tokenOut
        amountIn
        amountOut
        priceImpact
      }
    }
  }
}
```

**Get daily statistics:**

```graphql
query GetDailyStats {
  dailyStats(
    where: { chainId: 10143 }
    orderBy: "date"
    orderDirection: "desc"
    limit: 30
  ) {
    date
    totalRebalances
    totalSwaps
    totalVolumeUSD
    uniqueUsers
    activeStrategies
    averageDrift
    averagePriceImpact
  }
}
```

**Get all rebalances for a user:**

```graphql
query GetUserRebalances {
  rebalances(
    where: {
      strategy_: { userId: "0x742d35cc6634c0532925a3b844bc9e7595f0beb" }
    }
    orderBy: "blockTimestamp"
    orderDirection: "desc"
    limit: 20
  ) {
    id
    strategy {
      name
      chainId
    }
    drift
    driftPercentage
    gasReimbursed
    status
    blockTimestamp
    totalSwaps
  }
}
```

**Get system events:**

```graphql
query GetSystemEvents {
  systemEvents(
    orderBy: "blockTimestamp"
    orderDirection: "desc"
    limit: 10
  ) {
    id
    chainId
    type
    dexAddress
    approved
    pausedBy
    blockTimestamp
  }
}
```

## 📂 Project Structure

```
indexer/
├── abis/                       # Contract ABIs
│   ├── StrategyRegistry.ts     # Strategy events
│   └── RebalanceExecutor.ts    # Rebalance events
│
├── src/                        # Event handlers
│   ├── StrategyRegistry.ts     # Strategy lifecycle handlers
│   └── RebalanceExecutor.ts    # Rebalance handlers
│
├── ponder.config.ts            # Multi-chain config
├── ponder.schema.ts            # Database schema
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── .env.local.example          # Environment template
└── README.md                   # This file
```

## 🔄 Event Handlers

### StrategyRegistry Events

| Event | Handler | Description |
|-------|---------|-------------|
| StrategyCreated | Creates User + Strategy | New strategy created |
| StrategyUpdated | Updates Strategy | Strategy tokens/weights changed |
| StrategyPaused | Sets isPaused = true | Strategy paused by user |
| StrategyResumed | Sets isPaused = false | Strategy resumed |
| StrategyDeleted | Sets isActive = false | Strategy deleted (soft delete) |
| LastRebalanceTimeUpdated | Updates lastRebalanceTime | Bot updated timestamp |
| RebalanceExecutorUpdated | Creates SystemEvent | Admin updated executor |

### RebalanceExecutor Events

| Event | Handler | Description |
|-------|---------|-------------|
| RebalanceExecuted | Creates Rebalance + updates stats | Successful rebalance |
| RebalanceFailed | Creates Rebalance (FAILED) | Failed rebalance |
| SwapExecuted | Creates Swap + updates totals | Token swap |
| DEXApprovalUpdated | Creates SystemEvent | DEX approved/revoked |
| EmergencyPaused | Creates SystemEvent | System paused |
| EmergencyUnpaused | Creates SystemEvent | System unpaused |

## 🔗 Multi-Chain Support

### Supported Chains

- **Monad Testnet** (Chain ID: 10143)
- **Base Sepolia** (Chain ID: 84532)

### Chain-Specific Queries

```graphql
# Get Monad strategies only
query MonadStrategies {
  strategies(where: { chainId: 10143 }) {
    id
    name
    totalRebalances
  }
}

# Get Base Sepolia strategies only
query BaseStrategies {
  strategies(where: { chainId: 84532 }) {
    id
    name
    totalRebalances
  }
}

# Get all chains combined
query AllStrategies {
  strategies {
    id
    chainId
    name
    totalRebalances
  }
}
```

## 📈 Performance

### Indexing Speed

- **Initial sync**: ~1000 blocks/second (depends on RPC)
- **Real-time sync**: <1 second delay
- **Database writes**: Batched for efficiency

### Optimization Tips

1. **Set start blocks**: Configure `MONAD_START_BLOCK` and `BASE_START_BLOCK` to deployment blocks
2. **RPC performance**: Use dedicated RPC endpoints (Alchemy, Infura, etc.)
3. **Database indexes**: Schema includes optimized indexes
4. **Query optimization**: Use filters and limits in GraphQL queries

## 🔧 Development

### Type Generation

```bash
# Generate TypeScript types from schema
npm run codegen
```

This creates `./generated` with:
- Database types
- GraphQL types
- Event types
- Context types

### Testing Queries

Use the GraphQL playground or curl:

```bash
curl -X POST http://localhost:42069/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id strategyCount } }"}'
```

### Database Migrations

Ponder automatically handles schema migrations. Changes to `ponder.schema.ts` are applied on restart.

### Logs

```bash
# View logs in development
npm run dev

# Production logs
npm run start
```

## 🐛 Troubleshooting

### Database connection failed

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $PONDER_DATABASE_URL
```

### RPC errors

```bash
# Test RPC connectivity
curl -X POST $PONDER_RPC_URL_MONAD \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Missing contract addresses

Ensure all contract addresses in `.env.local` are:
- Valid Ethereum addresses (0x...)
- Deployed on the correct chain
- Match the contracts in `ponder.config.ts`

### Indexing stuck

```bash
# Check Ponder sync status
# Visit http://localhost:42069/status

# Clear cache and restart
rm -rf .ponder
npm run dev
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:42069/health
```

### Sync Status

```bash
curl http://localhost:42069/status
```

### Metrics

Ponder exposes metrics at:
```
http://localhost:42069/metrics
```

## 🔐 Security

- **Read-only**: Ponder only reads from blockchain, never writes
- **Database**: Use secure PostgreSQL credentials
- **RPC**: Avoid exposing RPC URLs publicly
- **GraphQL**: Consider rate limiting in production

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run codegen      # Generate TypeScript types
npm run build        # Build for production
npm run serve        # Serve built app
npm run lint         # Lint TypeScript
npm run format       # Format code with Prettier
```

## 🚢 Production Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run codegen
RUN npm run build
CMD ["npm", "run", "start"]
```

### Environment

```bash
NODE_ENV=production
PONDER_LOG_LEVEL=info
PONDER_DATABASE_URL=postgresql://...
PONDER_RPC_URL_MONAD=https://...
PONDER_RPC_URL_BASE=https://...
```

### Process Manager

```bash
# Using PM2
pm2 start npm --name rebased-indexer -- run start

# Using systemd
sudo systemctl start rebased-indexer
```

## 🤝 Integration with Backend

This Ponder indexer complements the NestJS backend:

| Component | Purpose | Port |
|-----------|---------|------|
| **Ponder Indexer** | GraphQL API for frontend/external consumers | 42069 |
| **NestJS Indexer** | Internal event processing for bot automation | N/A |
| **NestJS API** | REST API + WebSocket for user actions | 3000 |

Both indexers can run simultaneously, indexing the same contracts for different purposes.

## 📚 Resources

- **Ponder Docs**: https://ponder.sh
- **GraphQL Docs**: https://graphql.org
- **Contract Addresses**: See `.env.local.example`
- **Backend Docs**: `../backend/docs/`

## 📄 License

MIT

---

Built with ❤️ using Ponder, PostgreSQL, and GraphQL

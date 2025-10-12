# Rebased Backend

Non-custodial portfolio automation platform backend - Built with NestJS microservices architecture.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    REBASED BACKEND                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │ API Server  │    │ Bot Worker  │    │  Indexer    │    │
│  │ Port 3000   │    │   Cron      │    │   Events    │    │
│  │             │    │             │    │             │    │
│  │ • REST API  │    │ • Monitor   │    │ • Listeners │    │
│  │ • SIWE Auth │    │ • Executor  │    │ • Processor │    │
│  │ • WebSocket │    │ • DEX Agg   │    │ • Backfill  │    │
│  │ • Swagger   │    │ • Gas       │    │             │    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    │
│         │                   │                   │            │
│         └───────────────────┼───────────────────┘            │
│                             │                                │
│  ┌──────────────────────────┴────────────────────────┐      │
│  │          SHARED INFRASTRUCTURE                     │      │
│  ├────────────────────────────────────────────────────┤      │
│  │ • PostgreSQL (Prisma ORM)                          │      │
│  │ • Redis (Bull Queues + Pub/Sub)                    │      │
│  │ • Socket.IO (WebSocket Gateway)                    │      │
│  │ • Viem (Blockchain - Monad + Base)                 │      │
│  └────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7
- MetaMask wallet (for testing)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run prisma:generate

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Start infrastructure
docker-compose up -d postgres redis

# 5. Run migrations
npm run prisma:migrate
```

### Development

```bash
# Start API server (http://localhost:3000)
npm run start:api

# Start bot worker
npm run start:bot

# Start indexer worker
npm run start:indexer

# Start all services
npm run docker:up
```

### Access Tools

- **API Docs**: http://localhost:3000/api (Swagger)
- **Bull Board**: http://localhost:3001 (Queue monitoring)
- **Prisma Studio**: http://localhost:5555 (Database GUI)

## 📚 Documentation

- **[End-to-End Flow](./docs/END_TO_END_FLOW.md)** - Complete system architecture and flow
- **[Testing Guide](./docs/TESTING.md)** - Step-by-step testing instructions
- **[Environment Variables](./.env.example)** - All configuration options

## 🔑 Key Features

### Authentication (SIWE + JWT)
- Sign-In with Ethereum (EIP-4361)
- Nonce-based replay protection
- JWT with 7-day expiration
- MetaMask integration ready

### Strategy Management
- Create, read, update, delete strategies
- Multi-chain support (Monad + Base)
- Configurable rebalance intervals
- Weighted token allocations (basis points)

### Delegation (ERC-7710)
- EIP-712 typed signature verification
- MetaMask delegation signing
- On-chain proof validation
- Revocation support

### Automated Rebalancing
- Cron-based monitoring (every 30s)
- Drift calculation and detection
- Bull queue processing
- MEV protection (Flashbots + intents)
- DEX aggregation (1inch, 0x, ParaSwap, Uniswap)
- Gas price optimization

### Blockchain Indexing
- Multi-chain event listeners (Monad + Base)
- Real-time event processing
- Historical backfill support
- Database synchronization

### Real-Time Updates
- Socket.IO WebSocket gateway
- User-specific event rooms
- Rebalance notifications
- System alerts

### Inter-Service Communication
- Redis pub/sub for events
- 11 event channels
- Cross-service coordination
- Real-time state sync

## 🛠️ Technology Stack

| Category | Technology |
|----------|-----------|
| **Framework** | NestJS 10, TypeScript 5.3 |
| **Database** | PostgreSQL 16, Prisma ORM 5.8 |
| **Cache/Queue** | Redis 7, Bull 4.12, ioredis 5.3 |
| **Blockchain** | Viem 2.38, SIWE 2.1 |
| **WebSocket** | Socket.IO 4.6 |
| **API Docs** | Swagger (OpenAPI 3.0) |
| **Validation** | class-validator, class-transformer, Joi |
| **Testing** | Jest 29 |
| **DevOps** | Docker, Docker Compose |

## 📡 API Endpoints

### Authentication
- `POST /auth/nonce` - Get SIWE nonce
- `POST /auth/verify` - Verify signature, get JWT

### Strategies
- `GET /strategies` - List user strategies
- `POST /strategies` - Create new strategy
- `GET /strategies/:id` - Get strategy details
- `PATCH /strategies/:id` - Update strategy
- `DELETE /strategies/:id` - Deactivate strategy

### Delegations
- `GET /delegations` - List user delegations
- `POST /delegations` - Create delegation
- `GET /delegations/:id` - Get delegation details
- `POST /delegations/:id/revoke` - Revoke delegation
- `GET /delegations/stats` - Get delegation statistics

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with dependencies

**Full API docs**: http://localhost:3000/api (when running)

## 🔧 Development Scripts

```bash
# Start services
npm run start:api          # API server (watch mode)
npm run start:bot          # Bot worker (watch mode)
npm run start:indexer      # Indexer worker (watch mode)

# Build
npm run build              # Build all apps
npm run build:api          # Build API only
npm run build:bot          # Build bot only
npm run build:indexer      # Build indexer only

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio
npm run prisma:seed        # Seed database

# Docker
npm run docker:up          # Start infrastructure
npm run docker:down        # Stop infrastructure
npm run docker:logs        # View logs
npm run docker:build       # Rebuild images
npm run docker:restart     # Restart services

# Code quality
npm run lint               # Lint code
npm run format             # Format with Prettier
npm run test               # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test:cov           # Generate coverage
```

## 🐳 Docker Deployment

### Services

| Service | Port | Description |
|---------|------|-------------|
| api | 3000 | REST API + WebSocket |
| bot | - | Background worker |
| indexer | - | Event indexer |
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache + queue |
| bull-board | 3001 | Queue monitoring UI |
| prisma-studio | 5555 | Database GUI |

## 🎯 Roadmap

- [x] Phase 1: NestJS monorepo + infrastructure
- [x] Phase 2: API Server (auth, strategies, delegations)
- [x] Phase 3: Bot Worker (monitor, executor, DEX, gas, MEV)
- [x] Phase 4: Indexer Worker (listeners, processors, backfill)
- [x] Phase 5: Redis pub/sub + E2E testing
- [ ] **Next**: Smart contract deployment
- [ ] **Next**: Frontend integration
- [ ] **Next**: Testnet deployment
- [ ] **Next**: Security audit
- [ ] **Next**: Mainnet launch

## 📝 License

MIT

---

Built with ❤️ using NestJS, Prisma, Viem, and Bull

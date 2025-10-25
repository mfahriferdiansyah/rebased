# Rebased Backend

Non-custodial portfolio automation platform - Production-ready backend with automated rebalancing on Base.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REBASED BACKEND                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐      ┌──────────────┐                   │
│   │ API Server  │      │ Bot Worker   │                   │
│   │ Port 3000   │      │ Automated    │                   │
│   │             │      │              │                   │
│   │ • REST API  │      │ • Monitor    │                   │
│   │ • Auth      │      │ • Executor   │                   │
│   │ • Swagger   │      │ • DEX (0x)   │                   │
│   └──────┬──────┘      └──────┬───────┘                   │
│          │                    │                            │
│          └────────┬───────────┘                            │
│                   │                                        │
│   ┌───────────────┴──────────────────┐                    │
│   │  SHARED INFRASTRUCTURE            │                    │
│   ├───────────────────────────────────┤                    │
│   │ • PostgreSQL (Prisma ORM)         │                    │
│   │ • Redis (Bull Queues)             │                    │
│   │ • Viem (Base Blockchain)          │                    │
│   │ • Pyth Oracle (Price Feeds)       │                    │
│   └───────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## User Flow

```
User                Frontend             Backend              Blockchain
 │                    │                    │                    │
 │  1. Connect Wallet │                    │                    │
 │ ──────────────────>│                    │                    │
 │                    │  2. Request Nonce  │                    │
 │                    │ ──────────────────>│                    │
 │                    │ <──────────────────│                    │
 │  3. Sign Message   │                    │                    │
 │ <──────────────────│                    │                    │
 │ ──────────────────>│                    │                    │
 │                    │  4. Verify + JWT   │                    │
 │                    │ ──────────────────>│                    │
 │                    │ <──────────────────│                    │
 │                    │                    │                    │
 │  5. Create Strategy│                    │                    │
 │ ──────────────────>│ ──────────────────>│                    │
 │                    │ <──────────────────│                    │
 │                    │                    │  6. Deploy Strategy│
 │                    │  7. Sign TX        │ ──────────────────>│
 │ <──────────────────│                    │ <──────────────────│
 │ ──────────────────>│                    │                    │
 │                    │  8. Broadcast TX   │                    │
 │                    │ ───────────────────────────────────────>│
 │                    │                    │                    │
 │  9. Sign Delegation│                    │                    │
 │ <──────────────────│                    │                    │
 │ ──────────────────>│ 10. Store Del.    │                    │
 │                    │ ──────────────────>│                    │
 │                    │                    │                    │
 │                    │                    │ 11. Bot Monitors   │
 │                    │                    │    (every 30s)     │
 │                    │                    │                    │
 │                    │                    │ 12. Execute Rebal. │
 │                    │                    │ ──────────────────>│
 │                    │                    │                    │
 │ 13. Notify Complete│                    │                    │
 │ <──────────────────────────────────────<│                    │
```

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7
- Base RPC URL (Alchemy recommended)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run prisma:generate

# 3. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start infrastructure
docker-compose up -d

# 5. Run migrations
npm run prisma:migrate
```

### Run Services

```bash
# API Server
npm run start:api

# Bot Worker
npm run start:bot

# All services
npm run docker:up
```

### Access

- API Docs: http://localhost:3000/api
- Prisma Studio: `npm run prisma:studio`

## Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/rebased"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Base Mainnet
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASE_MAINNET_CHAIN_ID=8453
BASE_MAINNET_REGISTRY=0x051790142C92E55C88d45469419CBC74735bDec5
BASE_MAINNET_EXECUTOR=0xE5937713Ed44977dBBBdFF63aDab110e2A8aFF57
BASE_MAINNET_DELEGATION_MANAGER=0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3

# Bot Configuration
BOT_PRIVATE_KEY=<authorized_bot_key>
MONITORING_INTERVAL=30000  # 30 seconds

# 0x DEX Aggregator
ENABLE_0X=true
ZEROX_API_KEY=<your_0x_api_key>
```

## API Endpoints

### Authentication
```
POST /auth/nonce          - Get SIWE nonce
POST /auth/verify         - Verify signature + get JWT
```

### Strategies
```
GET    /strategies        - List user strategies
POST   /strategies        - Create strategy
GET    /strategies/:id    - Get strategy details
PATCH  /strategies/:id    - Update strategy
DELETE /strategies/:id    - Delete strategy
```

### Delegations
```
GET  /delegations         - List delegations
POST /delegations         - Create delegation
GET  /delegations/:id     - Get delegation details
POST /delegations/:id/revoke - Revoke delegation
```

## Bot Worker Flow

```
 ┌──────────────────────────────────────┐
 │ Bot Worker (Every 30 seconds)        │
 └───────────────┬──────────────────────┘
                 │
                 ▼
 ┌───────────────────────────────────┐
 │ 1. Fetch Active Strategies        │
 │    - User has delegation          │
 │    - Strategy is active           │
 └───────────┬───────────────────────┘
             │
             ▼
 ┌───────────────────────────────────┐
 │ 2. Calculate Current Portfolio    │
 │    - Get token balances           │
 │    - Fetch Pyth prices            │
 │    - Calculate allocations        │
 └───────────┬───────────────────────┘
             │
             ▼
 ┌───────────────────────────────────┐
 │ 3. Check if Rebalance Needed      │
 │    - Calculate drift              │
 │    - Check interval passed        │
 └───────────┬───────────────────────┘
             │
          No │ Yes
  ┌──────────┴──────────┐
  │                     │
  ▼                     ▼
Skip         ┌──────────────────────────┐
             │ 4. Get 0x Quotes          │
             │    - Calculate swap       │
             │    - Get best price       │
             └───────────┬──────────────┘
                         │
                         ▼
             ┌──────────────────────────┐
             │ 5. Execute Rebalance      │
             │    - Use delegation       │
             │    - Call RebalanceExecutor│
             │    - Verify success       │
             └───────────┬──────────────┘
                         │
                         ▼
             ┌──────────────────────────┐
             │ 6. Update Database        │
             │    - Log transaction      │
             │    - Notify user          │
             └──────────────────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Framework | NestJS 10 |
| Language | TypeScript 5.3 |
| Database | PostgreSQL 16 + Prisma 5.8 |
| Cache/Queue | Redis 7 + Bull 4.12 |
| Blockchain | Viem 2.38 + Base |
| Oracle | Pyth Network |
| DEX | 0x Protocol |
| Auth | SIWE (EIP-4361) |

## Deployment

```bash
# Build
npm run build

# Production mode
NODE_ENV=production npm run start:api
NODE_ENV=production npm run start:bot

# Docker
docker-compose up -d
```

## Security

- JWT-based authentication with 7-day expiration
- EIP-4361 (SIWE) for wallet verification
- Bot EOA authorization on smart contracts
- EIP-712 delegation signatures
- Rate limiting (100 req/min)
- Input validation with class-validator

## License

MIT

---

Built for automated crypto portfolio rebalancing on Base


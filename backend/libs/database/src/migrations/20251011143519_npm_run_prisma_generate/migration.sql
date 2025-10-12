-- CreateEnum
CREATE TYPE "RebalanceStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERTED');

-- CreateEnum
CREATE TYPE "IntentStatus" AS ENUM ('PENDING', 'EXECUTING', 'EXECUTED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REBALANCE_COMPLETED', 'REBALANCE_FAILED', 'DELEGATION_EXPIRING', 'STRATEGY_DRIFT', 'LOW_GAS_PRICE', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "users" (
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "strategyId" BIGINT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokens" TEXT[],
    "weights" INTEGER[],
    "rebalanceInterval" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "strategyId" TEXT,
    "userAddress" TEXT NOT NULL,
    "delegateAddress" TEXT NOT NULL,
    "delegationData" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebalances" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "userAddress" TEXT NOT NULL,
    "drift" BIGINT NOT NULL,
    "driftAfter" BIGINT,
    "gasUsed" BIGINT NOT NULL,
    "gasPrice" BIGINT NOT NULL,
    "gasCost" BIGINT NOT NULL,
    "swapsExecuted" INTEGER NOT NULL,
    "status" "RebalanceStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "executedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebalances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intents" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "intentData" JSONB NOT NULL,
    "status" "IntentStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "executedTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalStrategies" INTEGER NOT NULL DEFAULT 0,
    "activeStrategies" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalRebalances" INTEGER NOT NULL DEFAULT 0,
    "successfulRebalances" INTEGER NOT NULL DEFAULT 0,
    "totalValueLocked" BIGINT NOT NULL DEFAULT 0,
    "avgDriftReduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalGasSaved" BIGINT NOT NULL DEFAULT 0,
    "totalFeesCollected" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_prices" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "slow" BIGINT NOT NULL,
    "standard" BIGINT NOT NULL,
    "fast" BIGINT NOT NULL,
    "instant" BIGINT NOT NULL,
    "baseFee" BIGINT,
    "priorityFee" BIGINT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gas_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "strategies_userAddress_idx" ON "strategies"("userAddress");

-- CreateIndex
CREATE INDEX "strategies_chainId_idx" ON "strategies"("chainId");

-- CreateIndex
CREATE INDEX "strategies_isActive_idx" ON "strategies"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_userAddress_strategyId_chainId_key" ON "strategies"("userAddress", "strategyId", "chainId");

-- CreateIndex
CREATE INDEX "delegations_userAddress_idx" ON "delegations"("userAddress");

-- CreateIndex
CREATE INDEX "delegations_strategyId_idx" ON "delegations"("strategyId");

-- CreateIndex
CREATE INDEX "delegations_delegateAddress_idx" ON "delegations"("delegateAddress");

-- CreateIndex
CREATE INDEX "delegations_isActive_idx" ON "delegations"("isActive");

-- CreateIndex
CREATE INDEX "delegations_expiresAt_idx" ON "delegations"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "rebalances_txHash_key" ON "rebalances"("txHash");

-- CreateIndex
CREATE INDEX "rebalances_strategyId_idx" ON "rebalances"("strategyId");

-- CreateIndex
CREATE INDEX "rebalances_userAddress_idx" ON "rebalances"("userAddress");

-- CreateIndex
CREATE INDEX "rebalances_chainId_idx" ON "rebalances"("chainId");

-- CreateIndex
CREATE INDEX "rebalances_status_idx" ON "rebalances"("status");

-- CreateIndex
CREATE INDEX "rebalances_createdAt_idx" ON "rebalances"("createdAt");

-- CreateIndex
CREATE INDEX "rebalances_executedAt_idx" ON "rebalances"("executedAt");

-- CreateIndex
CREATE INDEX "intents_userAddress_idx" ON "intents"("userAddress");

-- CreateIndex
CREATE INDEX "intents_strategyId_idx" ON "intents"("strategyId");

-- CreateIndex
CREATE INDEX "intents_status_idx" ON "intents"("status");

-- CreateIndex
CREATE INDEX "intents_priority_idx" ON "intents"("priority");

-- CreateIndex
CREATE INDEX "intents_expiresAt_idx" ON "intents"("expiresAt");

-- CreateIndex
CREATE INDEX "analytics_chainId_idx" ON "analytics"("chainId");

-- CreateIndex
CREATE INDEX "analytics_date_idx" ON "analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_chainId_date_key" ON "analytics"("chainId", "date");

-- CreateIndex
CREATE INDEX "gas_prices_chainId_idx" ON "gas_prices"("chainId");

-- CreateIndex
CREATE INDEX "gas_prices_timestamp_idx" ON "gas_prices"("timestamp");

-- CreateIndex
CREATE INDEX "notifications_userAddress_idx" ON "notifications"("userAddress");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "users"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "users"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebalances" ADD CONSTRAINT "rebalances_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

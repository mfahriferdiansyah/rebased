-- AlterTable
ALTER TABLE "strategies" ADD COLUMN "delegatorAddress" TEXT;

-- CreateIndex
CREATE INDEX "strategies_delegatorAddress_idx" ON "strategies"("delegatorAddress");

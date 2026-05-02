-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('STOCKOUT_RISK', 'OVERSTOCK', 'CARRIER_PERFORMANCE_CHANGE', 'BILLING_ANOMALY', 'SLA_BREACH_RISK', 'CAPACITY_WARNING', 'PICK_RATE_DROP');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "logiq_insight" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT,
    "warehouseId" TEXT,
    "type" "InsightType" NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "actionUrl" TEXT,
    "dedupeKey" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logiq_insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrier_scorecard" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "destinationZone" INTEGER,
    "weightTier" TEXT,
    "onTimeRate" DOUBLE PRECISION NOT NULL,
    "damageRate" DOUBLE PRECISION NOT NULL,
    "avgCostCents" INTEGER NOT NULL,
    "avgActualDays" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logiq_query" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "explanation" TEXT,
    "chartType" TEXT,
    "sqlText" TEXT,
    "rowCount" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logiq_query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_forecast" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "onHandQty" INTEGER NOT NULL,
    "avgDailyOutbound" DOUBLE PRECISION NOT NULL,
    "daysOfStockRemaining" DOUBLE PRECISION,
    "stockoutRisk" DOUBLE PRECISION NOT NULL,
    "outboundSparkline" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_forecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logiq_insight_accountId_acknowledgedAt_idx" ON "logiq_insight"("accountId", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "logiq_insight_accountId_dedupeKey_idx" ON "logiq_insight"("accountId", "dedupeKey");

-- CreateIndex
CREATE INDEX "carrier_scorecard_accountId_carrier_idx" ON "carrier_scorecard"("accountId", "carrier");

-- CreateIndex
CREATE UNIQUE INDEX "carrier_scorecard_accountId_carrier_service_destinationZone_weightTier_key" ON "carrier_scorecard"("accountId", "carrier", "service", "destinationZone", "weightTier");

-- CreateIndex
CREATE INDEX "logiq_query_accountId_createdAt_idx" ON "logiq_query"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_forecast_accountId_stockoutRisk_idx" ON "stock_forecast"("accountId", "stockoutRisk");

-- CreateIndex
CREATE UNIQUE INDEX "stock_forecast_accountId_productId_warehouseId_key" ON "stock_forecast"("accountId", "productId", "warehouseId");

-- AddForeignKey
ALTER TABLE "logiq_insight" ADD CONSTRAINT "logiq_insight_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logiq_insight" ADD CONSTRAINT "logiq_insight_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logiq_insight" ADD CONSTRAINT "logiq_insight_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrier_scorecard" ADD CONSTRAINT "carrier_scorecard_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logiq_query" ADD CONSTRAINT "logiq_query_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_forecast" ADD CONSTRAINT "stock_forecast_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_forecast" ADD CONSTRAINT "stock_forecast_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_forecast" ADD CONSTRAINT "stock_forecast_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

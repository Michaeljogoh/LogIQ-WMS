-- CreateEnum
CREATE TYPE "RoutingAction" AS ENUM ('ASSIGN_TO_WAREHOUSE', 'ASSIGN_NEAREST', 'SPLIT_SHIPMENT', 'HOLD_FOR_STOCK');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'SHIPPED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "parentOrderId" TEXT;

-- CreateTable
CREATE TABLE "routing_rule" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "action" "RoutingAction" NOT NULL,
    "warehouseId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order_line" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "shippedQty" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "transfer_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routing_rule_accountId_idx" ON "routing_rule"("accountId");

-- CreateIndex
CREATE INDEX "transfer_order_accountId_idx" ON "transfer_order"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_order_accountId_toNumber_key" ON "transfer_order"("accountId", "toNumber");

-- CreateIndex
CREATE INDEX "transfer_order_line_transferId_idx" ON "transfer_order_line"("transferId");

-- CreateIndex
CREATE INDEX "transfer_order_line_productId_idx" ON "transfer_order_line"("productId");

-- CreateIndex
CREATE INDEX "order_parentOrderId_idx" ON "order"("parentOrderId");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rule" ADD CONSTRAINT "routing_rule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rule" ADD CONSTRAINT "routing_rule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rule" ADD CONSTRAINT "routing_rule_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfer_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

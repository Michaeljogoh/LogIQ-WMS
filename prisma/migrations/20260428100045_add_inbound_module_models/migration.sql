-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INBOUND', 'OUTBOUND', 'TRANSFER', 'ADJUSTMENT', 'CYCLE_COUNT_ADJUSTMENT', 'RETURN_RESTOCK', 'RETURN_DISPOSE', 'WORK_ORDER_CONSUME', 'WORK_ORDER_PRODUCE');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('KITTING', 'ASSEMBLY', 'BUNDLING', 'REPACKAGING');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bin" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "aisle" TEXT NOT NULL,
    "rack" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "maxWeight" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "weightOz" DOUBLE PRECISION,
    "lengthIn" DOUBLE PRECISION,
    "widthIn" DOUBLE PRECISION,
    "heightIn" DOUBLE PRECISION,
    "lotTracking" BOOLEAN NOT NULL DEFAULT false,
    "serialTracking" BOOLEAN NOT NULL DEFAULT false,
    "expiryTracking" BOOLEAN NOT NULL DEFAULT false,
    "lowStockThreshold" INTEGER,
    "deadStockDays" INTEGER NOT NULL DEFAULT 90,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_level" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "binId" TEXT,
    "type" "MovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "lotNumber" TEXT,
    "reason" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_line" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitCostCents" INTEGER,
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receiving_record" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "putawayBinId" TEXT,
    "receivedBy" TEXT NOT NULL,
    "discrepancyNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receiving_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "woNumber" TEXT NOT NULL,
    "type" "WorkOrderType" NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "targetQty" INTEGER NOT NULL,
    "completedQty" INTEGER NOT NULL DEFAULT 0,
    "outputProductId" TEXT,
    "outputBinId" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_input" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyPerUnit" INTEGER NOT NULL,
    "consumedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_input_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_count" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_count_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_count_line" (
    "id" TEXT NOT NULL,
    "cycleCountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "countedQty" INTEGER,
    "discrepancy" INTEGER,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_count_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bin_warehouseId_idx" ON "bin"("warehouseId");

-- CreateIndex
CREATE INDEX "product_accountId_merchantId_idx" ON "product"("accountId", "merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "product_accountId_merchantId_sku_key" ON "product"("accountId", "merchantId", "sku");

-- CreateIndex
CREATE INDEX "stock_level_accountId_warehouseId_idx" ON "stock_level"("accountId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_level_productId_binId_lotNumber_serialNumber_key" ON "stock_level"("productId", "binId", "lotNumber", "serialNumber");

-- CreateIndex
CREATE INDEX "stock_movement_accountId_productId_idx" ON "stock_movement"("accountId", "productId");

-- CreateIndex
CREATE INDEX "stock_movement_accountId_warehouseId_idx" ON "stock_movement"("accountId", "warehouseId");

-- CreateIndex
CREATE INDEX "supplier_accountId_idx" ON "supplier"("accountId");

-- CreateIndex
CREATE INDEX "purchase_order_accountId_merchantId_idx" ON "purchase_order"("accountId", "merchantId");

-- CreateIndex
CREATE INDEX "purchase_order_accountId_warehouseId_idx" ON "purchase_order"("accountId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_accountId_poNumber_key" ON "purchase_order"("accountId", "poNumber");

-- CreateIndex
CREATE INDEX "purchase_order_line_poId_idx" ON "purchase_order_line"("poId");

-- CreateIndex
CREATE INDEX "purchase_order_line_productId_idx" ON "purchase_order_line"("productId");

-- CreateIndex
CREATE INDEX "receiving_record_accountId_poId_idx" ON "receiving_record"("accountId", "poId");

-- CreateIndex
CREATE INDEX "receiving_record_accountId_productId_idx" ON "receiving_record"("accountId", "productId");

-- CreateIndex
CREATE INDEX "work_order_accountId_merchantId_idx" ON "work_order"("accountId", "merchantId");

-- CreateIndex
CREATE INDEX "work_order_accountId_warehouseId_idx" ON "work_order"("accountId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_accountId_woNumber_key" ON "work_order"("accountId", "woNumber");

-- CreateIndex
CREATE INDEX "work_order_input_workOrderId_idx" ON "work_order_input"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_input_productId_idx" ON "work_order_input"("productId");

-- CreateIndex
CREATE INDEX "cycle_count_accountId_warehouseId_idx" ON "cycle_count"("accountId", "warehouseId");

-- CreateIndex
CREATE INDEX "cycle_count_line_cycleCountId_idx" ON "cycle_count_line"("cycleCountId");

-- CreateIndex
CREATE INDEX "cycle_count_line_productId_binId_idx" ON "cycle_count_line"("productId", "binId");

-- AddForeignKey
ALTER TABLE "bin" ADD CONSTRAINT "bin_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin" ADD CONSTRAINT "bin_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_level" ADD CONSTRAINT "stock_level_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_level" ADD CONSTRAINT "stock_level_binId_fkey" FOREIGN KEY ("binId") REFERENCES "bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_level" ADD CONSTRAINT "stock_level_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_record" ADD CONSTRAINT "receiving_record_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_record" ADD CONSTRAINT "receiving_record_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_record" ADD CONSTRAINT "receiving_record_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_record" ADD CONSTRAINT "receiving_record_putawayBinId_fkey" FOREIGN KEY ("putawayBinId") REFERENCES "bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_outputProductId_fkey" FOREIGN KEY ("outputProductId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_outputBinId_fkey" FOREIGN KEY ("outputBinId") REFERENCES "bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_input" ADD CONSTRAINT "work_order_input_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_input" ADD CONSTRAINT "work_order_input_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count" ADD CONSTRAINT "cycle_count_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_line" ADD CONSTRAINT "cycle_count_line_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "cycle_count"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_line" ADD CONSTRAINT "cycle_count_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_line" ADD CONSTRAINT "cycle_count_line_binId_fkey" FOREIGN KEY ("binId") REFERENCES "bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

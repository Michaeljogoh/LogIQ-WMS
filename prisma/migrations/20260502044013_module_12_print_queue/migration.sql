-- CreateEnum
CREATE TYPE "PrintQueueStatus" AS ENUM ('PENDING', 'PURCHASING', 'READY', 'PRINTED', 'PARTIAL_FAILED');

-- CreateEnum
CREATE TYPE "PrintItemStatus" AS ENUM ('PENDING', 'PURCHASED', 'FAILED', 'PRINTED', 'REPRINTED');

-- CreateTable
CREATE TABLE "print_queue" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PrintQueueStatus" NOT NULL DEFAULT 'PENDING',
    "labelCount" INTEGER NOT NULL DEFAULT 0,
    "printedAt" TIMESTAMP(3),
    "manifestFormUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_queue_item" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "easypostRateId" TEXT NOT NULL,
    "weightOz" DOUBLE PRECISION NOT NULL,
    "packagingTypeId" TEXT,
    "shipmentId" TEXT,
    "status" "PrintItemStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "labelUrl" TEXT,
    "zplContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_queue_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thermal_printer" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "labelWidth" DOUBLE PRECISION NOT NULL DEFAULT 101.6,
    "labelHeight" DOUBLE PRECISION NOT NULL DEFAULT 152.4,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastPingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thermal_printer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "print_queue_accountId_warehouseId_idx" ON "print_queue"("accountId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "print_queue_item_shipmentId_key" ON "print_queue_item"("shipmentId");

-- CreateIndex
CREATE INDEX "print_queue_item_queueId_idx" ON "print_queue_item"("queueId");

-- CreateIndex
CREATE INDEX "print_queue_item_orderId_idx" ON "print_queue_item"("orderId");

-- CreateIndex
CREATE INDEX "thermal_printer_accountId_warehouseId_idx" ON "thermal_printer"("accountId", "warehouseId");

-- AddForeignKey
ALTER TABLE "print_queue" ADD CONSTRAINT "print_queue_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_queue" ADD CONSTRAINT "print_queue_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_queue_item" ADD CONSTRAINT "print_queue_item_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "print_queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_queue_item" ADD CONSTRAINT "print_queue_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_queue_item" ADD CONSTRAINT "print_queue_item_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_queue_item" ADD CONSTRAINT "print_queue_item_packagingTypeId_fkey" FOREIGN KEY ("packagingTypeId") REFERENCES "packaging_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thermal_printer" ADD CONSTRAINT "thermal_printer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thermal_printer" ADD CONSTRAINT "thermal_printer_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

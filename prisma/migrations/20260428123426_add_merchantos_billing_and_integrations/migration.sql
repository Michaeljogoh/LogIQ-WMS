-- CreateEnum
CREATE TYPE "AsnStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "PickStrategy" AS ENUM ('SINGLE', 'BATCH', 'ZONE', 'WAVE');

-- CreateEnum
CREATE TYPE "PickStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'RETURNED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentPeriod" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('STORAGE_PER_UNIT_DAY', 'STORAGE_PER_PALLET_DAY', 'PICK_INITIAL', 'PICK_ADDITIONAL', 'RECEIVING_PER_PO', 'RECEIVING_PER_UNIT', 'PACKING_PER_SHIPMENT', 'LABEL_PER_SHIPMENT', 'RETURN_PROCESSING', 'SPECIAL_HANDLING');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SENT', 'PAID', 'OVERDUE', 'DISPUTED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('SHOPIFY', 'WOOCOMMERCE', 'BIGCOMMERCE', 'ETSY', 'TIKTOK_SHOP', 'EBAY');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "purchase_order_asn" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "asnNumber" TEXT NOT NULL,
    "expectedArrivalDate" TIMESTAMP(3),
    "status" "AsnStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_asn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "channelOrderId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "shippingName" TEXT NOT NULL,
    "shippingLine1" TEXT NOT NULL,
    "shippingCity" TEXT NOT NULL,
    "shippingState" TEXT NOT NULL,
    "shippingZip" TEXT NOT NULL,
    "shippingCountry" TEXT NOT NULL DEFAULT 'US',
    "slaHours" INTEGER,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pickedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_list" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "strategy" "PickStrategy" NOT NULL,
    "status" "PickStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_list_item" (
    "id" TEXT NOT NULL,
    "pickListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "binLabel" TEXT NOT NULL,
    "requiredQty" INTEGER NOT NULL,
    "pickedQty" INTEGER NOT NULL DEFAULT 0,
    "scannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_list_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "easypostShipmentId" TEXT,
    "carrier" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "labelUrl" TEXT,
    "weightOz" DOUBLE PRECISION,
    "rateCents" INTEGER,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'LABEL_CREATED',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "logiqRecommended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_event" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "description" TEXT,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrier_performance_log" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "destinationZone" INTEGER,
    "weightOz" DOUBLE PRECISION NOT NULL,
    "promisedDays" INTEGER,
    "actualDays" INTEGER,
    "onTime" BOOLEAN,
    "damaged" BOOLEAN NOT NULL DEFAULT false,
    "rateCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_performance_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_contract" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "paymentPeriod" "PaymentPeriod" NOT NULL DEFAULT 'MONTHLY',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_rule" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "rateCents" INTEGER NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "includedUnits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_rule" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "thresholdMins" INTEGER NOT NULL,
    "warningPct" INTEGER NOT NULL DEFAULT 90,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "anomalyFlags" JSONB,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "description" TEXT NOT NULL,
    "unitCount" INTEGER NOT NULL,
    "unitRateCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchantId" TEXT,
    "type" "IntegrationType" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "credentials" JSONB NOT NULL,
    "metadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_order_asn_accountId_poId_idx" ON "purchase_order_asn"("accountId", "poId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_asn_accountId_asnNumber_key" ON "purchase_order_asn"("accountId", "asnNumber");

-- CreateIndex
CREATE INDEX "order_accountId_merchantId_status_idx" ON "order"("accountId", "merchantId", "status");

-- CreateIndex
CREATE INDEX "order_accountId_warehouseId_idx" ON "order"("accountId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "order_accountId_channelOrderId_channel_key" ON "order"("accountId", "channelOrderId", "channel");

-- CreateIndex
CREATE INDEX "order_line_orderId_idx" ON "order_line"("orderId");

-- CreateIndex
CREATE INDEX "order_line_productId_idx" ON "order_line"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "pick_list_orderId_key" ON "pick_list"("orderId");

-- CreateIndex
CREATE INDEX "pick_list_accountId_warehouseId_status_idx" ON "pick_list"("accountId", "warehouseId", "status");

-- CreateIndex
CREATE INDEX "pick_list_item_pickListId_idx" ON "pick_list_item"("pickListId");

-- CreateIndex
CREATE INDEX "pick_list_item_productId_idx" ON "pick_list_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_easypostShipmentId_key" ON "shipment"("easypostShipmentId");

-- CreateIndex
CREATE INDEX "shipment_accountId_orderId_idx" ON "shipment"("accountId", "orderId");

-- CreateIndex
CREATE INDEX "tracking_event_accountId_shipmentId_idx" ON "tracking_event"("accountId", "shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "carrier_performance_log_shipmentId_key" ON "carrier_performance_log"("shipmentId");

-- CreateIndex
CREATE INDEX "carrier_performance_log_accountId_carrier_idx" ON "carrier_performance_log"("accountId", "carrier");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_contract_merchantId_key" ON "merchant_contract"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_contract_accountId_merchantId_idx" ON "merchant_contract"("accountId", "merchantId");

-- CreateIndex
CREATE INDEX "fee_rule_accountId_contractId_idx" ON "fee_rule"("accountId", "contractId");

-- CreateIndex
CREATE INDEX "sla_rule_accountId_contractId_idx" ON "sla_rule"("accountId", "contractId");

-- CreateIndex
CREATE INDEX "invoice_accountId_merchantId_idx" ON "invoice"("accountId", "merchantId");

-- CreateIndex
CREATE INDEX "invoice_line_accountId_invoiceId_idx" ON "invoice_line"("accountId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_accountId_merchantId_type_key" ON "integration"("accountId", "merchantId", "type");

-- AddForeignKey
ALTER TABLE "purchase_order_asn" ADD CONSTRAINT "purchase_order_asn_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_asn" ADD CONSTRAINT "purchase_order_asn_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list" ADD CONSTRAINT "pick_list_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list" ADD CONSTRAINT "pick_list_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list" ADD CONSTRAINT "pick_list_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list_item" ADD CONSTRAINT "pick_list_item_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "pick_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list_item" ADD CONSTRAINT "pick_list_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list_item" ADD CONSTRAINT "pick_list_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list_item" ADD CONSTRAINT "pick_list_item_binId_fkey" FOREIGN KEY ("binId") REFERENCES "bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_event" ADD CONSTRAINT "tracking_event_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_event" ADD CONSTRAINT "tracking_event_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrier_performance_log" ADD CONSTRAINT "carrier_performance_log_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrier_performance_log" ADD CONSTRAINT "carrier_performance_log_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_contract" ADD CONSTRAINT "merchant_contract_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_contract" ADD CONSTRAINT "merchant_contract_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_rule" ADD CONSTRAINT "fee_rule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_rule" ADD CONSTRAINT "fee_rule_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "merchant_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_rule" ADD CONSTRAINT "sla_rule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_rule" ADD CONSTRAINT "sla_rule_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "merchant_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "merchant_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration" ADD CONSTRAINT "integration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration" ADD CONSTRAINT "integration_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

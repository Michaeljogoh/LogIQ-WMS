-- AlterTable
ALTER TABLE "shipment" ADD COLUMN     "dimWeightOz" DOUBLE PRECISION,
ADD COLUMN     "packagingCostCents" INTEGER,
ADD COLUMN     "packagingTypeId" TEXT;

-- CreateTable
CREATE TABLE "packaging_type" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lengthIn" DOUBLE PRECISION NOT NULL,
    "widthIn" DOUBLE PRECISION NOT NULL,
    "heightIn" DOUBLE PRECISION NOT NULL,
    "maxWeightOz" DOUBLE PRECISION NOT NULL,
    "tareWeightOz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "packaging_type_accountId_idx" ON "packaging_type"("accountId");

-- CreateIndex
CREATE INDEX "shipment_accountId_packagingTypeId_idx" ON "shipment"("accountId", "packagingTypeId");

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_packagingTypeId_fkey" FOREIGN KEY ("packagingTypeId") REFERENCES "packaging_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_type" ADD CONSTRAINT "packaging_type_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

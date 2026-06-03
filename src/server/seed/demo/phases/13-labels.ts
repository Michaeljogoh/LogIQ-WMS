import type { PrismaClient } from "../../../../generated/prisma/client";
import type { SeedContext } from "../types";

export async function seedLabels(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const templates = await db.labelTemplate.createManyAndReturn({
    data: [
      {
        accountId: ctx.accountId,
        name: "Standard Product Barcode",
        type: "PRODUCT_BARCODE",
        widthMm: 101.6,
        heightMm: 50.8,
        fields: { showSku: true, showName: true, showBarcode: true },
        isDefault: true,
      },
      {
        accountId: ctx.accountId,
        name: "Bin Location Label",
        type: "BIN_LOCATION",
        widthMm: 101.6,
        heightMm: 50.8,
        fields: {
          showAisle: true,
          showRack: true,
          showLevel: true,
          showBarcode: true,
        },
        isDefault: true,
      },
      {
        accountId: ctx.accountId,
        name: "Pallet Label",
        type: "PALLET",
        widthMm: 101.6,
        heightMm: 152.4,
        fields: { showSscc: true, showPo: true, showQty: true },
        isDefault: true,
      },
      {
        accountId: ctx.accountId,
        name: "Shipping Outer Label",
        type: "SHIPPING_OUTER",
        widthMm: 101.6,
        heightMm: 152.4,
        fields: { showBarcode: true, showAddress: true, showOrderId: true },
        isDefault: true,
      },
    ],
  });

  // Thermal printers per warehouse
  await db.thermalPrinter.createMany({
    data: [
      {
        accountId: ctx.accountId,
        warehouseId: ctx.laxId,
        name: "Zebra ZT411 — Dock 1",
        ipAddress: "192.168.1.101",
        port: 9100,
        labelWidth: 101.6,
        labelHeight: 152.4,
        isOnline: true,
        lastPingAt: new Date(),
      },
      {
        accountId: ctx.accountId,
        warehouseId: ctx.laxId,
        name: "Zebra ZT411 — Dock 2",
        ipAddress: "192.168.1.102",
        port: 9100,
        labelWidth: 101.6,
        labelHeight: 152.4,
        isOnline: true,
        lastPingAt: new Date(),
      },
      {
        accountId: ctx.accountId,
        warehouseId: ctx.ordId,
        name: "Zebra ZD421 — Station A",
        ipAddress: "192.168.2.101",
        port: 9100,
        labelWidth: 101.6,
        labelHeight: 152.4,
        isOnline: false,
      },
      {
        accountId: ctx.accountId,
        warehouseId: ctx.ordId,
        name: "Zebra ZD421 — Station B",
        ipAddress: "192.168.2.102",
        port: 9100,
        labelWidth: 101.6,
        labelHeight: 152.4,
        isOnline: true,
        lastPingAt: new Date(),
      },
    ],
  });

  return { ...ctx, labelTemplateIds: templates.map((t) => t.id) };
}

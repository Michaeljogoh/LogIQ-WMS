import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt, seqRef } from "../helpers";
import type { SeedContext } from "../types";

const CARRIERS = ["UPS", "FEDEX", "USPS"] as const;

/**
 * Extra Apex Sportswear data so the merchant portal dashboard charts and KPIs
 * look full on first sign-in (14-day trends, open orders, shipments, low stock).
 */
export async function seedMerchantPortal(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const productIds = ctx.apexProductIds.slice(0, 6);
  if (productIds.length === 0) {
    return ctx;
  }

  // Low-stock SKUs for inventory alerts on the portal dashboard
  for (const productId of ctx.apexProductIds.slice(0, 4)) {
    await db.stockLevel.updateMany({
      where: { accountId: ctx.accountId, productId },
      data: { quantity: randInt(2, 8), reservedQty: 0 },
    });
  }

  const portalOrderIds: string[] = [];
  const portalFulfilledIds: string[] = [];

  // One order per day for the last 14 days — mix of fulfilled / open
  for (let day = 0; day < 14; day += 1) {
    const fulfilled = day % 3 !== 0;
    const fulfillmentStatus = fulfilled
      ? "FULFILLED"
      : day % 2 === 0
        ? "UNFULFILLED"
        : "PARTIALLY_FULFILLED";
    const createdAt = daysAgo(day);
    const productSlice = productIds.slice(0, randInt(1, 3));

    const order = await db.order.create({
      data: {
        accountId: ctx.accountId,
        merchantId: ctx.apexId,
        warehouseId: ctx.laxId,
        channelOrderId: seqRef("APEX-PORTAL", day + 1, 4),
        channel: "SHOPIFY",
        status: "PENDING",
        fulfillmentStatus,
        shippingName: "Portal Demo Customer",
        shippingLine1: "1200 Market St",
        shippingCity: "Los Angeles",
        shippingState: "CA",
        shippingZip: "90015",
        shippingCountry: "US",
        slaHours: 48,
        dueAt: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000),
        createdAt,
        updatedAt: createdAt,
      },
    });

    await db.orderLine.createMany({
      data: productSlice.map((productId) => ({
        orderId: order.id,
        productId,
        sku: productId,
        quantity: randInt(1, 2),
        pickedQty: fulfilled ? randInt(1, 2) : 0,
        createdAt,
      })),
    });

    portalOrderIds.push(order.id);
    if (fulfilled) {
      portalFulfilledIds.push(order.id);
    }
  }

  // Extra open backlog for donut chart
  for (let i = 0; i < 6; i += 1) {
    const createdAt = daysAgo(randInt(0, 2));
    const order = await db.order.create({
      data: {
        accountId: ctx.accountId,
        merchantId: ctx.apexId,
        warehouseId: ctx.laxId,
        channelOrderId: seqRef("APEX-OPEN", i + 1, 3),
        channel: "SHOPIFY",
        status: "PENDING",
        fulfillmentStatus: i % 3 === 0 ? "PARTIALLY_FULFILLED" : "UNFULFILLED",
        shippingName: "Backlog Customer",
        shippingLine1: "500 Broadway",
        shippingCity: "New York",
        shippingState: "NY",
        shippingZip: "10012",
        shippingCountry: "US",
        slaHours: 48,
        dueAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
        createdAt,
        updatedAt: createdAt,
      },
    });
    await db.orderLine.create({
      data: {
        orderId: order.id,
        productId: productIds[0] ?? ctx.apexProductIds[0] ?? "",
        sku: "APEX-BACKLOG",
        quantity: 1,
        pickedQty: 0,
        createdAt,
      },
    });
    portalOrderIds.push(order.id);
  }

  const packagingTypeId = ctx.packagingTypeIds[0];
  for (let i = 0; i < portalFulfilledIds.length; i += 1) {
    const orderId = portalFulfilledIds[i];
    if (!orderId) continue;
    const shippedAt = daysAgo(Math.max(i % 12, 0));
    const carrier = CARRIERS[i % CARRIERS.length] ?? "UPS";

    await db.shipment.create({
      data: {
        accountId: ctx.accountId,
        orderId,
        carrier,
        service: carrier === "UPS" ? "UPS Ground" : "FedEx Ground",
        trackingNumber: `1ZPORTAL${String(100000 + i)}`,
        weightOz: randInt(8, 24),
        rateCents: randInt(650, 1800),
        status: i < 3 ? "IN_TRANSIT" : "DELIVERED",
        shippedAt,
        deliveredAt: i < 3 ? null : daysAgo(Math.max(i % 10, 0)),
        logiqRecommended: true,
        packagingTypeId: packagingTypeId ?? undefined,
        packagingCostCents: 99,
        dimWeightOz: 12,
        createdAt: shippedAt,
      },
    });
  }

  return {
    ...ctx,
    orderIds: [...ctx.orderIds, ...portalOrderIds],
    fulfilledOrderIds: [...ctx.fulfilledOrderIds, ...portalFulfilledIds],
  };
}

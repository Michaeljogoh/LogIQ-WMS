import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, pick, randInt } from "../helpers";
import type { SeedContext } from "../types";

const CARRIERS = ["UPS", "FEDEX", "USPS"] as const;
const SERVICES: Record<string, string[]> = {
  UPS: ["UPS Ground", "UPS 2nd Day Air"],
  FEDEX: ["FedEx Ground", "FedEx Express Saver"],
  USPS: ["USPS Priority Mail", "USPS First Class"],
};

type ShipmentStatus =
  | "LABEL_CREATED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "RETURNED"
  | "VOIDED";

function shipmentStatusProgression(daysAgo: number): ShipmentStatus {
  if (daysAgo >= 7) return "DELIVERED";
  if (daysAgo >= 5) return "DELIVERED";
  if (daysAgo >= 3)
    return Math.random() > 0.15 ? "DELIVERED" : "OUT_FOR_DELIVERY";
  if (daysAgo >= 2) return "IN_TRANSIT";
  return "LABEL_CREATED";
}

export async function seedFulfillment(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const shipmentIds: string[] = [];

  // Pick lists for 10 unfulfilled orders
  const pickableOrders = ctx.unfulfilledOrderIds.slice(0, 10);
  for (let i = 0; i < pickableOrders.length; i++) {
    const orderId = pickableOrders[i];
    if (!orderId) continue;
    const pickStatus = i < 5 ? "PENDING" : "IN_PROGRESS";

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            product: {
              include: {
                stockLevels: { where: { warehouseId: ctx.laxId }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!order) continue;

    const pickList = await db.pickList.create({
      data: {
        accountId: ctx.accountId,
        warehouseId: ctx.laxId,
        strategy: "SINGLE",
        status: pickStatus,
        assignedTo:
          pickStatus === "IN_PROGRESS" ? ctx.staff1AccountUserId : null,
        startedAt: pickStatus === "IN_PROGRESS" ? daysAgo(0) : null,
        orderId,
      },
    });

    for (const line of order.lines) {
      const stockLevel = line.product.stockLevels[0];
      if (!stockLevel) continue;
      const bin = await db.bin.findUnique({
        where: { id: stockLevel.binId },
        select: { label: true, id: true },
      });
      if (!bin) continue;

      await db.pickListItem.create({
        data: {
          pickListId: pickList.id,
          productId: line.productId,
          orderId,
          binId: bin.id,
          binLabel: bin.label,
          requiredQty: line.quantity,
          pickedQty:
            pickStatus === "IN_PROGRESS" ? Math.floor(line.quantity * 0.5) : 0,
        },
      });
    }
  }

  // Shipments for all fulfilled orders
  for (let i = 0; i < ctx.fulfilledOrderIds.length; i++) {
    const orderId = ctx.fulfilledOrderIds[i];
    if (!orderId) continue;
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { createdAt: true },
    });
    if (!order) continue;

    const orderAge = Math.floor(
      (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const carrier = pick([...CARRIERS]);
    const service = pick(SERVICES[carrier] ?? ["Ground"]);
    const status = shipmentStatusProgression(orderAge);
    const shippedAt = daysAgo(Math.max(orderAge - 1, 0));
    const deliveredAt =
      status === "DELIVERED" ? daysAgo(Math.max(orderAge - 3, 0)) : null;
    const packagingTypeId =
      ctx.packagingTypeIds[i % ctx.packagingTypeIds.length] ?? "";
    const rateCents = randInt(450, 2200);
    const weightOz = randInt(6, 48);

    // Mark pick list completed for fulfilled orders
    const existingPick = await db.pickList.findFirst({ where: { orderId } });
    if (!existingPick) {
      await db.pickList.create({
        data: {
          accountId: ctx.accountId,
          warehouseId: ctx.laxId,
          strategy: "SINGLE",
          status: "COMPLETED",
          orderId,
          completedAt: shippedAt,
        },
      });
    }

    const shipment = await db.shipment.create({
      data: {
        accountId: ctx.accountId,
        orderId,
        carrier,
        service,
        trackingNumber: `1Z${randInt(100000000, 999999999)}`,
        weightOz,
        rateCents,
        status,
        shippedAt,
        deliveredAt,
        logiqRecommended: Math.random() > 0.5,
        packagingTypeId,
        packagingCostCents:
          ctx.packagingTypeIds.indexOf(packagingTypeId) >= 0 ? 75 : 125,
        dimWeightOz: Math.round(weightOz * 1.1),
      },
    });
    shipmentIds.push(shipment.id);

    // Tracking events
    const trackingEvents: Array<{
      status: ShipmentStatus;
      description: string;
      daysOffset: number;
    }> = [
      {
        status: "LABEL_CREATED",
        description: "Shipping label created",
        daysOffset: orderAge - 1,
      },
      {
        status: "IN_TRANSIT",
        description: "Package picked up by carrier",
        daysOffset: Math.max(orderAge - 2, 0),
      },
    ];
    if (["OUT_FOR_DELIVERY", "DELIVERED"].includes(status)) {
      trackingEvents.push({
        status: "OUT_FOR_DELIVERY",
        description: "Out for delivery",
        daysOffset: Math.max(orderAge - 3, 0),
      });
    }
    if (status === "DELIVERED") {
      trackingEvents.push({
        status: "DELIVERED",
        description: "Package delivered",
        daysOffset: Math.max(orderAge - 4, 0),
      });
    }

    for (const event of trackingEvents) {
      await db.trackingEvent.create({
        data: {
          accountId: ctx.accountId,
          shipmentId: shipment.id,
          status: event.status,
          description: event.description,
          eventAt: daysAgo(event.daysOffset),
        },
      });
    }

    // Carrier performance log
    const promisedDays = carrier === "USPS" ? 3 : carrier === "FEDEX" ? 2 : 5;
    const actualDays =
      status === "DELIVERED" && deliveredAt
        ? Math.ceil(
            (deliveredAt.getTime() - shippedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

    await db.carrierPerformanceLog.create({
      data: {
        accountId: ctx.accountId,
        shipmentId: shipment.id,
        carrier,
        service,
        destinationZone: randInt(2, 8),
        weightOz,
        promisedDays,
        actualDays,
        onTime: actualDays != null ? actualDays <= promisedDays : null,
        damaged: Math.random() < 0.02,
        rateCents,
      },
    });
  }

  // 2 exception shipments
  const exceptionOrderIds = ctx.fulfilledOrderIds.slice(0, 2);
  for (const orderId of exceptionOrderIds) {
    const existing = await db.shipment.findFirst({ where: { orderId } });
    if (existing && existing.status === "IN_TRANSIT") {
      await db.shipment.update({
        where: { id: existing.id },
        data: { status: "EXCEPTION" },
      });
    }
  }

  return { ...ctx, shipmentIds };
}

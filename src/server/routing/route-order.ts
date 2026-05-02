import type { PrismaClient } from "@/generated/prisma/client";
import { shouldMeterOrderOverage } from "@/server/billing/plan-limits";
import { scheduleOverageOrderMeter } from "@/server/billing/usage-ingest";
import { evaluateRoutingConditions } from "@/server/routing/conditions";
import { distanceBetweenZipsMiles } from "@/server/routing/distance";
import {
  allocateOrderLinesAcrossWarehouses,
  canFulfillOrderAtWarehouse,
  canFulfillOrderGlobally,
} from "@/server/routing/inventory";

function mergeOrderLinesByProduct(
  lines: { productId: string; quantity: number; sku: string }[],
): { productId: string; quantity: number; sku: string }[] {
  const m = new Map<
    string,
    { productId: string; quantity: number; sku: string }
  >();
  for (const l of lines) {
    const prev = m.get(l.productId);
    if (prev) {
      prev.quantity += l.quantity;
    } else {
      m.set(l.productId, { ...l });
    }
  }
  return [...m.values()];
}

export type RouteOrderOutcome =
  | { outcome: "ASSIGNED"; warehouseId: string }
  | { outcome: "SPLIT"; childOrderIds: string[]; parentOrderId: string }
  | { outcome: "HELD" }
  | { outcome: "SKIPPED"; reason: string };

async function listWarehousesWithFullStock(
  db: PrismaClient,
  accountId: string,
  lines: { productId: string; quantity: number }[],
): Promise<string[]> {
  const warehouses = await db.warehouse.findMany({
    where: { accountId, isActive: true },
    select: { id: true },
  });
  const ok: string[] = [];
  for (const w of warehouses) {
    if (await canFulfillOrderAtWarehouse(db, accountId, w.id, lines)) {
      ok.push(w.id);
    }
  }
  return ok;
}

function sortWarehouseIdsByDistanceToZip(
  warehouseIds: string[],
  warehouses: { id: string; zip: string }[],
  orderZip: string,
): string[] {
  const zipById = new Map(warehouses.map((w) => [w.id, w.zip]));
  return [...warehouseIds].sort((a, b) => {
    const za = zipById.get(a) ?? "";
    const zb = zipById.get(b) ?? "";
    return (
      distanceBetweenZipsMiles(orderZip, za) -
      distanceBetweenZipsMiles(orderZip, zb)
    );
  });
}

async function assignOrderToWarehouse(
  db: PrismaClient,
  accountId: string,
  orderId: string,
  warehouseId: string,
): Promise<void> {
  const wh = await db.warehouse.findFirst({
    where: { id: warehouseId, accountId, isActive: true },
  });
  if (!wh) {
    throw new Error("Target warehouse not found or inactive.");
  }
  await db.order.update({
    where: { id: orderId, accountId },
    data: { warehouseId },
  });
}

const SPLIT_CHANNEL = "LOGIQ_SPLIT";

export async function routeOrderEngine(
  db: PrismaClient,
  accountId: string,
  orderId: string,
): Promise<RouteOrderOutcome> {
  const order = await db.order.findFirst({
    where: { id: orderId, accountId },
    include: {
      lines: { include: { product: { select: { sku: true } } } },
      pickList: { select: { id: true } },
      childOrders: { select: { id: true } },
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.channel === SPLIT_CHANNEL || order.parentOrderId) {
    return { outcome: "SKIPPED", reason: "Child or split order row." };
  }

  if (order.pickList) {
    throw new Error("Order already has a pick list; routing is locked.");
  }

  const mergedLines = mergeOrderLinesByProduct(
    order.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      sku: l.sku,
    })),
  );
  const lineNeeds = mergedLines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
  }));

  const warehouses = await db.warehouse.findMany({
    where: { accountId, isActive: true },
    select: { id: true, zip: true },
  });
  const sortedAllIds = sortWarehouseIdsByDistanceToZip(
    warehouses.map((w) => w.id),
    warehouses,
    order.shippingZip,
  );

  const rules = await db.routingRule.findMany({
    where: {
      accountId,
      isActive: true,
      OR: [{ merchantId: order.merchantId }, { merchantId: null }],
    },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    if (
      !evaluateRoutingConditions(rule.conditions, order as never, {
        carrier: null,
      })
    ) {
      continue;
    }

    if (rule.action === "HOLD_FOR_STOCK") {
      const ok = await canFulfillOrderGlobally(db, accountId, lineNeeds);
      if (!ok) {
        await db.order.update({
          where: { id: order.id },
          data: { status: "ON_HOLD", warehouseId: null },
        });
        return { outcome: "HELD" };
      }
      continue;
    }

    if (rule.action === "ASSIGN_TO_WAREHOUSE") {
      if (!rule.warehouseId) {
        continue;
      }
      const can = await canFulfillOrderAtWarehouse(
        db,
        accountId,
        rule.warehouseId,
        lineNeeds,
      );
      if (!can) {
        continue;
      }
      await assignOrderToWarehouse(db, accountId, order.id, rule.warehouseId);
      return { outcome: "ASSIGNED", warehouseId: rule.warehouseId };
    }

    if (rule.action === "ASSIGN_NEAREST") {
      const withStock = await listWarehousesWithFullStock(
        db,
        accountId,
        lineNeeds,
      );
      const sorted = sortWarehouseIdsByDistanceToZip(
        withStock,
        warehouses,
        order.shippingZip,
      );
      if (sorted.length === 0) {
        const split = await splitOrderAcrossWarehouses(
          db,
          accountId,
          order,
          mergedLines,
          sortedAllIds,
        );
        if (split) {
          return split;
        }
        await db.order.update({
          where: { id: order.id },
          data: { status: "ON_HOLD", warehouseId: null },
        });
        return { outcome: "HELD" };
      }
      const nearest = sorted[0];
      if (!nearest) {
        throw new Error("No warehouse candidate.");
      }
      await assignOrderToWarehouse(db, accountId, order.id, nearest);
      return { outcome: "ASSIGNED", warehouseId: nearest };
    }

    if (rule.action === "SPLIT_SHIPMENT") {
      const split = await splitOrderAcrossWarehouses(
        db,
        accountId,
        order,
        mergedLines,
        sortedAllIds,
      );
      if (split) {
        return split;
      }
      await db.order.update({
        where: { id: order.id },
        data: { status: "ON_HOLD", warehouseId: null },
      });
      return { outcome: "HELD" };
    }
  }

  const withStock = await listWarehousesWithFullStock(db, accountId, lineNeeds);
  const sorted = sortWarehouseIdsByDistanceToZip(
    withStock,
    warehouses,
    order.shippingZip,
  );
  if (sorted.length === 0) {
    const split = await splitOrderAcrossWarehouses(
      db,
      accountId,
      order,
      mergedLines,
      sortedAllIds,
    );
    if (split) {
      return split;
    }
    await db.order.update({
      where: { id: order.id },
      data: { status: "ON_HOLD", warehouseId: null },
    });
    return { outcome: "HELD" };
  }
  const nearest = sorted[0];
  if (!nearest) {
    throw new Error("No warehouse candidate.");
  }
  await assignOrderToWarehouse(db, accountId, order.id, nearest);
  return { outcome: "ASSIGNED", warehouseId: nearest };
}

async function splitOrderAcrossWarehouses(
  db: PrismaClient,
  accountId: string,
  order: {
    id: string;
    merchantId: string;
    shippingName: string;
    shippingLine1: string;
    shippingCity: string;
    shippingState: string;
    shippingZip: string;
    shippingCountry: string;
    channelOrderId: string;
    slaHours: number | null;
    dueAt: Date | null;
  },
  mergedLines: { productId: string; quantity: number; sku: string }[],
  sortedWarehouseIds: string[],
): Promise<RouteOrderOutcome | null> {
  const lineNeeds = mergedLines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
  }));

  const allocation = await allocateOrderLinesAcrossWarehouses(
    db,
    accountId,
    lineNeeds,
    sortedWarehouseIds,
  );

  if (!allocation) {
    return null;
  }

  if (allocation.size === 0) {
    return null;
  }

  if (allocation.size === 1) {
    const onlyId = [...allocation.keys()][0];
    if (!onlyId) {
      return null;
    }
    await assignOrderToWarehouse(db, accountId, order.id, onlyId);
    return { outcome: "ASSIGNED", warehouseId: onlyId };
  }

  const overageForChildren: { accountId: string; orderId: string }[] = [];
  await db.$transaction(async (tx) => {
    await tx.order.deleteMany({
      where: {
        accountId,
        parentOrderId: order.id,
        channel: SPLIT_CHANNEL,
      },
    });

    await tx.order.update({
      where: { id: order.id, accountId },
      data: { status: "ON_HOLD", warehouseId: null },
    });

    const childIds: string[] = [];
    for (const [whId, products] of allocation) {
      const lineCreates = mergedLines
        .map((ol) => {
          const q = products.get(ol.productId) ?? 0;
          if (q <= 0) {
            return null;
          }
          return {
            productId: ol.productId,
            sku: ol.sku,
            quantity: q,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (lineCreates.length === 0) {
        continue;
      }

      const markOverage = await shouldMeterOrderOverage(tx, accountId);
      const child = await tx.order.create({
        data: {
          accountId,
          merchantId: order.merchantId,
          warehouseId: whId,
          parentOrderId: order.id,
          channelOrderId: `${order.channelOrderId}::SPLIT::${whId}`,
          channel: SPLIT_CHANNEL,
          status: "PENDING",
          fulfillmentStatus: "UNFULFILLED",
          shippingName: order.shippingName,
          shippingLine1: order.shippingLine1,
          shippingCity: order.shippingCity,
          shippingState: order.shippingState,
          shippingZip: order.shippingZip,
          shippingCountry: order.shippingCountry,
          slaHours: order.slaHours,
          dueAt: order.dueAt,
          lines: {
            create: lineCreates.map((lc) => ({
              productId: lc.productId,
              sku: lc.sku,
              quantity: lc.quantity,
            })),
          },
        },
        select: { id: true },
      });
      childIds.push(child.id);
      if (markOverage) {
        overageForChildren.push({ accountId, orderId: child.id });
      }
    }

    if (!childIds.length) {
      throw new Error("Split allocation produced no child orders.");
    }
  });

  for (const o of overageForChildren) {
    scheduleOverageOrderMeter(o.accountId, o.orderId);
  }

  const children = await db.order.findMany({
    where: { parentOrderId: order.id, accountId, channel: SPLIT_CHANNEL },
    select: { id: true },
  });

  return {
    outcome: "SPLIT",
    parentOrderId: order.id,
    childOrderIds: children.map((c) => c.id),
  };
}

import { subDays } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

async function upsertInsight(args: {
  accountId: string;
  merchantId: string;
  warehouseId: string;
  dedupeKey: string;
  title: string;
  body: string;
  severity: "WARNING" | "CRITICAL";
  data: Record<string, unknown>;
  actionUrl: string;
}) {
  const existing = await db.logIQInsight.findFirst({
    where: {
      accountId: args.accountId,
      dedupeKey: args.dedupeKey,
      acknowledgedAt: null,
    },
  });
  if (existing) {
    await db.logIQInsight.update({
      where: { id: existing.id },
      data: {
        title: args.title,
        body: args.body,
        severity: args.severity,
        data: args.data as Prisma.InputJsonValue,
        actionUrl: args.actionUrl,
        merchantId: args.merchantId,
        warehouseId: args.warehouseId,
      },
    });
    return;
  }
  await db.logIQInsight.create({
    data: {
      accountId: args.accountId,
      merchantId: args.merchantId,
      warehouseId: args.warehouseId,
      type: "STOCKOUT_RISK",
      severity: args.severity,
      title: args.title,
      body: args.body,
      data: args.data as Prisma.InputJsonValue,
      actionUrl: args.actionUrl,
      dedupeKey: args.dedupeKey,
    },
  });
}

export async function runStockoutScanForAccount(
  accountId: string,
): Promise<void> {
  const since = subDays(new Date(), 14);

  const levels = await db.stockLevel.findMany({
    where: {
      accountId,
      quantity: { gt: 0 },
    },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          merchantId: true,
        },
      },
      warehouse: { select: { id: true, name: true, code: true } },
    },
  });

  for (const level of levels) {
    const outbound = await db.stockMovement.aggregate({
      where: {
        accountId,
        productId: level.productId,
        warehouseId: level.warehouseId,
        type: "OUTBOUND",
        createdAt: { gte: since },
      },
      _sum: { quantityDelta: true },
    });
    const rawSum = outbound._sum.quantityDelta ?? 0;
    const unitsOut = Math.abs(rawSum);
    const avgDaily = unitsOut / 14;
    const onHand = level.quantity;
    const daysRemaining = avgDaily > 0 ? onHand / avgDaily : null;
    const stockoutRisk =
      daysRemaining === null
        ? 0
        : Math.min(1, Math.max(0, 1 - daysRemaining / 14));

    const recentMoves = await db.stockMovement.findMany({
      where: {
        accountId,
        productId: level.productId,
        warehouseId: level.warehouseId,
        type: "OUTBOUND",
        createdAt: { gte: since },
      },
      select: { createdAt: true, quantityDelta: true },
    });
    const byDay = new Map<string, number>();
    for (const m of recentMoves) {
      const d = m.createdAt.toISOString().slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + Math.abs(m.quantityDelta));
    }
    const outboundSparkline = [...byDay.values()].slice(-14);

    await db.stockForecast.upsert({
      where: {
        accountId_productId_warehouseId: {
          accountId,
          productId: level.productId,
          warehouseId: level.warehouseId,
        },
      },
      create: {
        accountId,
        productId: level.productId,
        warehouseId: level.warehouseId,
        onHandQty: onHand,
        avgDailyOutbound: avgDaily,
        daysOfStockRemaining: daysRemaining,
        stockoutRisk,
        outboundSparkline,
      },
      update: {
        onHandQty: onHand,
        avgDailyOutbound: avgDaily,
        daysOfStockRemaining: daysRemaining,
        stockoutRisk,
        outboundSparkline,
        computedAt: new Date(),
      },
    });

    if (daysRemaining !== null && daysRemaining < 7) {
      await upsertInsight({
        accountId,
        merchantId: level.product.merchantId,
        warehouseId: level.warehouseId,
        dedupeKey: `stockout:${level.productId}:${level.warehouseId}`,
        severity: daysRemaining < 3 ? "CRITICAL" : "WARNING",
        title: `Stockout risk: ${level.product.sku}`,
        body: `${level.product.name} in ${level.warehouse.name} (${level.warehouse.code}) has about ${daysRemaining.toFixed(1)} days of stock at recent outbound velocity.`,
        data: {
          productId: level.productId,
          warehouseId: level.warehouseId,
          sku: level.product.sku,
          daysRemaining,
          onHand,
          avgDailyOutbound: avgDaily,
        },
        actionUrl: `/inventory/products/${level.productId}`,
      });
    }
  }
}

import { subDays } from "date-fns";
import { db } from "@/lib/db";

export async function runOverstockScanForAccount(
  accountId: string,
): Promise<void> {
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
          deadStockDays: true,
        },
      },
      warehouse: { select: { id: true, name: true, code: true } },
    },
  });

  for (const level of levels) {
    const lastMove = await db.stockMovement.findFirst({
      where: {
        accountId,
        productId: level.productId,
        warehouseId: level.warehouseId,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (!lastMove) {
      continue;
    }

    const thresholdDays = level.product.deadStockDays;
    const staleCutoff = subDays(new Date(), thresholdDays);
    if (lastMove.createdAt > staleCutoff) {
      continue;
    }

    const carryingCents = Math.round(level.quantity * 50);
    const dedupeKey = `overstock:${level.productId}:${level.warehouseId}`;

    const existing = await db.logIQInsight.findFirst({
      where: {
        accountId,
        dedupeKey,
        acknowledgedAt: null,
      },
    });

    const body = `${level.product.name} (${level.product.sku}) in ${level.warehouse.name}: no movement since ${lastMove.createdAt.toISOString().slice(0, 10)}. Estimated carrying cost ~ $${(carryingCents / 100).toFixed(2)} / month (illustrative).`;

    if (existing) {
      await db.logIQInsight.update({
        where: { id: existing.id },
        data: {
          title: `Overstock: ${level.product.sku}`,
          body,
          severity: "WARNING",
          merchantId: level.product.merchantId,
          warehouseId: level.warehouseId,
          data: {
            productId: level.productId,
            warehouseId: level.warehouseId,
            lastMovementAt: lastMove.createdAt.toISOString(),
            quantity: level.quantity,
          },
          actionUrl: `/inventory/products/${level.productId}`,
        },
      });
    } else {
      await db.logIQInsight.create({
        data: {
          accountId,
          merchantId: level.product.merchantId,
          warehouseId: level.warehouseId,
          type: "OVERSTOCK",
          severity: "WARNING",
          title: `Overstock: ${level.product.sku}`,
          body,
          dedupeKey,
          data: {
            productId: level.productId,
            warehouseId: level.warehouseId,
            lastMovementAt: lastMove.createdAt.toISOString(),
            quantity: level.quantity,
          },
          actionUrl: `/inventory/products/${level.productId}`,
        },
      });
    }
  }
}

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export async function sumAvailableForProductWarehouse(
  db: PrismaClient | Prisma.TransactionClient,
  accountId: string,
  warehouseId: string,
  productId: string,
): Promise<number> {
  const rows = await db.stockLevel.findMany({
    where: { accountId, warehouseId, productId },
    select: { quantity: true, reservedQty: true },
  });
  return rows.reduce((s, r) => s + Math.max(0, r.quantity - r.reservedQty), 0);
}

export async function canFulfillOrderAtWarehouse(
  db: PrismaClient | Prisma.TransactionClient,
  accountId: string,
  warehouseId: string,
  lines: { productId: string; quantity: number }[],
): Promise<boolean> {
  for (const line of lines) {
    const avail = await sumAvailableForProductWarehouse(
      db,
      accountId,
      warehouseId,
      line.productId,
    );
    if (avail < line.quantity) {
      return false;
    }
  }
  return true;
}

/** True if sum of available units across all account warehouses covers each SKU. */
export async function canFulfillOrderGlobally(
  db: PrismaClient | Prisma.TransactionClient,
  accountId: string,
  lines: { productId: string; quantity: number }[],
): Promise<boolean> {
  const warehouses = await db.warehouse.findMany({
    where: { accountId, isActive: true },
    select: { id: true },
  });
  const need = new Map<string, number>();
  for (const line of lines) {
    need.set(
      line.productId,
      (need.get(line.productId) ?? 0) + line.quantity,
    );
  }
  for (const [productId, qty] of need) {
    let total = 0;
    for (const w of warehouses) {
      total += await sumAvailableForProductWarehouse(
        db,
        accountId,
        w.id,
        productId,
      );
      if (total >= qty) {
        break;
      }
    }
    if (total < qty) {
      return false;
    }
  }
  return true;
}

/**
 * Nearest-first greedy allocation. Returns null if globally infeasible.
 * Map: warehouseId -> (productId -> allocated qty)
 */
export async function allocateOrderLinesAcrossWarehouses(
  db: PrismaClient | Prisma.TransactionClient,
  accountId: string,
  lines: { productId: string; quantity: number }[],
  sortedWarehouseIds: string[],
): Promise<Map<string, Map<string, number>> | null> {
  const need = new Map<string, number>();
  for (const line of lines) {
    need.set(
      line.productId,
      (need.get(line.productId) ?? 0) + line.quantity,
    );
  }

  const allocation = new Map<string, Map<string, number>>();

  for (const productId of [...need.keys()]) {
    let remaining = need.get(productId) ?? 0;
    if (remaining <= 0) {
      continue;
    }
    for (const whId of sortedWarehouseIds) {
      if (remaining <= 0) {
        break;
      }
      const avail = await sumAvailableForProductWarehouse(
        db,
        accountId,
        whId,
        productId,
      );
      const take = Math.min(remaining, avail);
      if (take > 0) {
        let m = allocation.get(whId);
        if (!m) {
          m = new Map();
          allocation.set(whId, m);
        }
        m.set(productId, (m.get(productId) ?? 0) + take);
        remaining -= take;
      }
    }
    if (remaining > 0) {
      return null;
    }
  }

  return allocation;
}

import { subDays } from "date-fns";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

export const alertsRouter = createTRPCRouter({
  getLowStock: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        warehouseId: z.string().cuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);

      const products = await ctx.db.product.findMany({
        where: {
          accountId,
          lowStockThreshold: { not: null },
          isActive: true,
        },
        include: {
          merchant: { select: { id: true, name: true } },
          stockLevels: {
            where: input.warehouseId
              ? { warehouseId: input.warehouseId }
              : undefined,
            select: { quantity: true, reservedQty: true, warehouseId: true },
          },
        },
      });

      return products
        .map((product) => {
          const quantity = product.stockLevels.reduce(
            (sum, row) => sum + row.quantity,
            0,
          );
          const reservedQty = product.stockLevels.reduce(
            (sum, row) => sum + row.reservedQty,
            0,
          );
          const availableQty = quantity - reservedQty;
          return {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            merchant: product.merchant,
            lowStockThreshold: product.lowStockThreshold,
            quantity,
            reservedQty,
            availableQty,
          };
        })
        .filter((item) => item.lowStockThreshold !== null)
        .filter((item) => item.availableQty < (item.lowStockThreshold ?? 0))
        .sort((a, b) => a.availableQty - b.availableQty);
    }),

  getDeadStock: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        warehouseId: z.string().cuid().optional(),
        dayThreshold: z.number().int().min(1).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const thresholdDate = subDays(new Date(), input.dayThreshold ?? 90);

      const stockLevels = await ctx.db.stockLevel.findMany({
        where: {
          accountId,
          quantity: { gt: 0 },
          ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              deadStockDays: true,
              merchant: { select: { id: true, name: true } },
            },
          },
          bin: {
            select: { id: true, label: true },
          },
        },
      });

      const productIds = [...new Set(stockLevels.map((row) => row.product.id))];
      const movements = await ctx.db.stockMovement.findMany({
        where: {
          accountId,
          productId: { in: productIds },
          ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: {
          productId: true,
          createdAt: true,
        },
      });

      const lastMovementByProduct = new Map<string, Date>();
      for (const movement of movements) {
        if (!lastMovementByProduct.has(movement.productId)) {
          lastMovementByProduct.set(movement.productId, movement.createdAt);
        }
      }

      return stockLevels
        .filter((row) => {
          const lastMovement = lastMovementByProduct.get(row.product.id);
          if (!lastMovement) {
            return true;
          }
          const daysForProduct =
            input.dayThreshold ?? row.product.deadStockDays;
          return lastMovement < subDays(new Date(), daysForProduct);
        })
        .filter((row) => {
          const lastMovement = lastMovementByProduct.get(row.product.id);
          return !lastMovement || lastMovement < thresholdDate;
        })
        .map((row) => ({
          productId: row.product.id,
          sku: row.product.sku,
          name: row.product.name,
          merchant: row.product.merchant,
          bin: row.bin,
          warehouseId: row.warehouseId,
          quantity: row.quantity,
          lastMovementAt: lastMovementByProduct.get(row.product.id) ?? null,
        }));
    }),
});

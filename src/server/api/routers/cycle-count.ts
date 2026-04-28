import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

export const cycleCountRouter = createTRPCRouter({
  list: protectedProc
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
      return ctx.db.cycleCount.findMany({
        where: {
          accountId,
          ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
        },
        include: {
          _count: {
            select: { lines: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ cycleCountId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const cycleCount = await ctx.db.cycleCount.findFirst({
        where: { id: input.cycleCountId, accountId },
        include: {
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true },
              },
              bin: {
                select: { id: true, label: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!cycleCount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cycle count not found.",
        });
      }

      return cycleCount;
    }),

  create: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        warehouseId: z.string().cuid(),
        name: z.string().min(1),
        binIds: z.array(z.string().cuid()).min(1),
        scheduledDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);

      const warehouse = await ctx.db.warehouse.findFirst({
        where: { id: input.warehouseId, accountId },
        select: { id: true },
      });
      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Warehouse not found.",
        });
      }

      const stockRows = await ctx.db.stockLevel.findMany({
        where: {
          accountId,
          warehouseId: input.warehouseId,
          binId: { in: input.binIds },
          quantity: { gt: 0 },
        },
        select: {
          productId: true,
          binId: true,
          quantity: true,
        },
      });

      if (stockRows.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No stock found for the selected bins.",
        });
      }

      return ctx.db.cycleCount.create({
        data: {
          accountId,
          warehouseId: input.warehouseId,
          name: input.name,
          status: "ACTIVE",
          scheduledDate: input.scheduledDate,
          createdBy: userId,
          lines: {
            create: stockRows.map((row) => ({
              productId: row.productId,
              binId: row.binId,
              expectedQty: row.quantity,
            })),
          },
        },
        include: { lines: true },
      });
    }),

  submitScan: protectedProc
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
        cycleCountLineId: z.string().cuid(),
        countedQty: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const line = await ctx.db.cycleCountLine.findFirst({
        where: { id: input.cycleCountLineId, cycleCount: { accountId } },
        include: {
          cycleCount: {
            select: { id: true, status: true },
          },
        },
      });

      if (!line) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cycle count line not found.",
        });
      }
      if (line.cycleCount.status !== "ACTIVE") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cycle count is not active.",
        });
      }

      return ctx.db.cycleCountLine.update({
        where: { id: line.id },
        data: {
          countedQty: input.countedQty,
          discrepancy: input.countedQty - line.expectedQty,
        },
      });
    }),

  reconcile: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ cycleCountId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);

      const cycleCount = await ctx.db.cycleCount.findFirst({
        where: { id: input.cycleCountId, accountId },
        include: { lines: true },
      });
      if (!cycleCount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cycle count not found.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        for (const line of cycleCount.lines) {
          if (line.countedQty === null) {
            continue;
          }
          const delta = line.countedQty - line.expectedQty;
          if (delta === 0) {
            await tx.cycleCountLine.update({
              where: { id: line.id },
              data: { reconciled: true, discrepancy: 0 },
            });
            continue;
          }

          const stock = await tx.stockLevel.findFirst({
            where: {
              accountId,
              productId: line.productId,
              binId: line.binId,
            },
            orderBy: { updatedAt: "asc" },
          });
          const quantityBefore = stock?.quantity ?? 0;
          const quantityAfter = quantityBefore + delta;
          if (quantityAfter < 0) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Reconciliation would create negative stock.",
            });
          }

          if (stock) {
            await tx.stockLevel.update({
              where: { id: stock.id },
              data: { quantity: quantityAfter },
            });
          } else {
            await tx.stockLevel.create({
              data: {
                accountId,
                productId: line.productId,
                binId: line.binId,
                warehouseId: cycleCount.warehouseId,
                quantity: quantityAfter,
                reservedQty: 0,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              accountId,
              productId: line.productId,
              warehouseId: cycleCount.warehouseId,
              binId: line.binId,
              type: "CYCLE_COUNT_ADJUSTMENT",
              quantityDelta: delta,
              quantityBefore,
              quantityAfter,
              performedBy: userId,
              reason: "cycle_count_reconcile",
              referenceId: cycleCount.id,
              referenceType: "CYCLE_COUNT",
            },
          });

          await tx.cycleCountLine.update({
            where: { id: line.id },
            data: {
              reconciled: true,
              discrepancy: delta,
            },
          });
        }

        return tx.cycleCount.update({
          where: { id: cycleCount.id },
          data: {
            status: "RECONCILED",
            completedAt: new Date(),
          },
          include: { lines: true },
        });
      });
    }),
});

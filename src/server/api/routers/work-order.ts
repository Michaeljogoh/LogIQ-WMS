import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

const workOrderInputLine = z.object({
  productId: z.string().cuid(),
  qtyPerUnit: z.number().int().positive(),
});

export const workOrderRouter = createTRPCRouter({
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
        status: z
          .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.workOrder.findMany({
        where: {
          accountId,
          ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          merchant: { select: { id: true, name: true } },
          outputProduct: { select: { id: true, sku: true, name: true } },
          outputBin: { select: { id: true, label: true } },
          _count: { select: { inputLines: true } },
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
    .input(z.object({ workOrderId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const workOrder = await ctx.db.workOrder.findFirst({
        where: { id: input.workOrderId, accountId },
        include: {
          merchant: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          outputProduct: { select: { id: true, sku: true, name: true } },
          outputBin: { select: { id: true, label: true } },
          inputLines: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
            },
          },
        },
      });
      if (!workOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work order not found.",
        });
      }
      return workOrder;
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
        merchantId: z.string().cuid(),
        warehouseId: z.string().cuid(),
        type: z.enum(["KITTING", "ASSEMBLY", "BUNDLING", "REPACKAGING"]),
        targetQty: z.number().int().positive(),
        outputProductId: z.string().cuid().optional().nullable(),
        outputBinId: z.string().cuid().optional().nullable(),
        scheduledDate: z.coerce.date().optional().nullable(),
        inputLines: z.array(workOrderInputLine).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const year = new Date().getUTCFullYear();

      const merchant = await ctx.db.merchant.findFirst({
        where: { id: input.merchantId, accountId },
        select: { id: true },
      });
      const warehouse = await ctx.db.warehouse.findFirst({
        where: { id: input.warehouseId, accountId },
        select: { id: true },
      });
      const outputProduct = input.outputProductId
        ? await ctx.db.product.findFirst({
            where: {
              id: input.outputProductId,
              accountId,
              merchantId: input.merchantId,
            },
            select: { id: true },
          })
        : null;
      const outputBin = input.outputBinId
        ? await ctx.db.bin.findFirst({
            where: {
              id: input.outputBinId,
              warehouseId: input.warehouseId,
              warehouse: { accountId },
            },
            select: { id: true },
          })
        : null;
      const inputProducts = await ctx.db.product.findMany({
        where: {
          accountId,
          merchantId: input.merchantId,
          id: { in: input.inputLines.map((line) => line.productId) },
        },
        select: { id: true },
      });

      if (!merchant || !warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant or warehouse not found.",
        });
      }
      if (input.outputProductId && !outputProduct) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Output product not found.",
        });
      }
      if (input.outputBinId && !outputBin) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Output bin not found.",
        });
      }
      if (
        inputProducts.length !==
        new Set(input.inputLines.map((line) => line.productId)).size
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more input products were not found.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${`wo_seq:${accountId}:${year}`}));
        `;
        const rows = await tx.$queryRaw<{ next_seq: number }[]>`
          SELECT COALESCE(MAX(CAST(split_part("woNumber", '-', 3) AS INTEGER)), 0) + 1 AS next_seq
          FROM work_order
          WHERE "accountId" = ${accountId}
            AND "woNumber" LIKE ${`WO-${year}-%`}
        `;
        const woNumber = `WO-${year}-${String(rows[0]?.next_seq ?? 1).padStart(6, "0")}`;

        return tx.workOrder.create({
          data: {
            accountId,
            merchantId: input.merchantId,
            warehouseId: input.warehouseId,
            woNumber,
            type: input.type,
            targetQty: input.targetQty,
            outputProductId: input.outputProductId ?? null,
            outputBinId: input.outputBinId ?? null,
            scheduledDate: input.scheduledDate ?? null,
            createdBy: userId,
            inputLines: {
              create: input.inputLines.map((line) => ({
                productId: line.productId,
                qtyPerUnit: line.qtyPerUnit,
              })),
            },
          },
          include: { inputLines: true },
        });
      });
    }),

  start: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ workOrderId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.$transaction(async (tx) => {
        const workOrder = await tx.workOrder.findFirst({
          where: { id: input.workOrderId, accountId },
          include: { inputLines: true },
        });
        if (!workOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Work order not found.",
          });
        }
        if (workOrder.status !== "PENDING") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Only pending work orders can be started.",
          });
        }

        for (const line of workOrder.inputLines) {
          const requiredQty = line.qtyPerUnit * workOrder.targetQty;
          const rows = await tx.stockLevel.findMany({
            where: {
              accountId,
              warehouseId: workOrder.warehouseId,
              productId: line.productId,
            },
            orderBy: { updatedAt: "asc" },
          });
          const availableQty = rows.reduce(
            (sum, row) => sum + (row.quantity - row.reservedQty),
            0,
          );
          if (availableQty < requiredQty) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Insufficient available stock to reserve work order inputs.",
            });
          }

          let remaining = requiredQty;
          for (const row of rows) {
            if (remaining <= 0) {
              break;
            }
            const rowAvailable = row.quantity - row.reservedQty;
            if (rowAvailable <= 0) {
              continue;
            }
            const reserve = Math.min(remaining, rowAvailable);
            await tx.stockLevel.update({
              where: { id: row.id },
              data: { reservedQty: row.reservedQty + reserve },
            });
            remaining -= reserve;
          }
        }

        return tx.workOrder.update({
          where: { id: workOrder.id },
          data: { status: "IN_PROGRESS" },
        });
      });
    }),

  complete: protectedProc
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
        workOrderId: z.string().cuid(),
        completedQty: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      return ctx.db.$transaction(async (tx) => {
        const workOrder = await tx.workOrder.findFirst({
          where: { id: input.workOrderId, accountId },
          include: { inputLines: true },
        });
        if (!workOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Work order not found.",
          });
        }
        if (workOrder.status !== "IN_PROGRESS") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Work order must be in progress before completion.",
          });
        }
        if (!workOrder.outputProductId || !workOrder.outputBinId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Output product and output bin are required to complete work order.",
          });
        }
        if (input.completedQty > workOrder.targetQty) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Completed quantity cannot exceed target quantity.",
          });
        }

        for (const line of workOrder.inputLines) {
          const consumeQty = line.qtyPerUnit * input.completedQty;
          const stockRows = await tx.stockLevel.findMany({
            where: {
              accountId,
              warehouseId: workOrder.warehouseId,
              productId: line.productId,
            },
            orderBy: { updatedAt: "asc" },
          });

          let remaining = consumeQty;
          for (const row of stockRows) {
            if (remaining <= 0) {
              break;
            }
            const availableReserved = Math.min(row.reservedQty, row.quantity);
            if (availableReserved <= 0) {
              continue;
            }
            const consumeFromRow = Math.min(remaining, availableReserved);
            const quantityAfter = row.quantity - consumeFromRow;
            const reservedAfter = row.reservedQty - consumeFromRow;

            await tx.stockLevel.update({
              where: { id: row.id },
              data: {
                quantity: quantityAfter,
                reservedQty: reservedAfter,
              },
            });

            await tx.stockMovement.create({
              data: {
                accountId,
                productId: line.productId,
                warehouseId: workOrder.warehouseId,
                binId: row.binId,
                type: "WORK_ORDER_CONSUME",
                quantityDelta: -consumeFromRow,
                quantityBefore: row.quantity,
                quantityAfter,
                performedBy: userId,
                referenceId: workOrder.id,
                referenceType: "WORK_ORDER",
                reason: "work_order_complete_consume",
              },
            });

            remaining -= consumeFromRow;
          }

          if (remaining > 0) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Reserved stock was insufficient to complete this work order.",
            });
          }

          await tx.workOrderInput.update({
            where: { id: line.id },
            data: {
              consumedQty: line.consumedQty + consumeQty,
            },
          });
        }

        const outputStock = await tx.stockLevel.findFirst({
          where: {
            accountId,
            productId: workOrder.outputProductId,
            binId: workOrder.outputBinId,
          },
        });
        const quantityBefore = outputStock?.quantity ?? 0;
        const quantityAfter = quantityBefore + input.completedQty;
        if (outputStock) {
          await tx.stockLevel.update({
            where: { id: outputStock.id },
            data: { quantity: quantityAfter },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              accountId,
              productId: workOrder.outputProductId,
              binId: workOrder.outputBinId,
              warehouseId: workOrder.warehouseId,
              quantity: quantityAfter,
              reservedQty: 0,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            accountId,
            productId: workOrder.outputProductId,
            warehouseId: workOrder.warehouseId,
            binId: workOrder.outputBinId,
            type: "WORK_ORDER_PRODUCE",
            quantityDelta: input.completedQty,
            quantityBefore,
            quantityAfter,
            performedBy: userId,
            referenceId: workOrder.id,
            referenceType: "WORK_ORDER",
            reason: "work_order_complete_produce",
          },
        });

        return tx.workOrder.update({
          where: { id: workOrder.id },
          data: {
            status: "COMPLETED",
            completedQty: input.completedQty,
            completedAt: new Date(),
          },
        });
      });
    }),
});

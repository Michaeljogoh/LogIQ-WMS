import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

export const pickListRouter = createTRPCRouter({
  createForOrder: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        orderId: z.string().cuid(),
        warehouseId: z.string().cuid(),
        strategy: z.enum(["SINGLE", "BATCH", "ZONE", "WAVE"]).default("SINGLE"),
        assignedTo: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: input.orderId, accountId },
          include: { lines: true, pickList: { select: { id: true } } },
        });
        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }
        if (order.pickList) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Order already has a pick list.",
          });
        }

        const items: Array<{
          productId: string;
          orderId: string;
          binId: string;
          binLabel: string;
          requiredQty: number;
        }> = [];

        for (const line of order.lines) {
          const product = await tx.product.findFirst({
            where: { id: line.productId, accountId },
            select: { id: true, expiryTracking: true },
          });
          if (!product) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Product for order line not found.",
            });
          }
          const stocks = await tx.stockLevel.findMany({
            where: {
              accountId,
              warehouseId: input.warehouseId,
              productId: line.productId,
              quantity: { gt: 0 },
            },
            include: {
              bin: { select: { id: true, label: true } },
            },
            orderBy: product.expiryTracking
              ? [{ expiryDate: "asc" }, { quantity: "desc" }]
              : [{ createdAt: "asc" }, { quantity: "desc" }],
          });

          let remaining = line.quantity;
          for (const stock of stocks) {
            if (remaining <= 0) {
              break;
            }
            const available = stock.quantity - stock.reservedQty;
            if (available <= 0) {
              continue;
            }
            const reserve = Math.min(available, remaining);
            await tx.stockLevel.update({
              where: { id: stock.id },
              data: { reservedQty: stock.reservedQty + reserve },
            });
            items.push({
              productId: line.productId,
              orderId: order.id,
              binId: stock.binId,
              binLabel: stock.bin.label,
              requiredQty: reserve,
            });
            remaining -= reserve;
          }

          if (remaining > 0) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Insufficient stock to reserve for this order.",
            });
          }
        }

        return tx.pickList.create({
          data: {
            accountId,
            warehouseId: input.warehouseId,
            strategy: input.strategy,
            status: "PENDING",
            assignedTo: input.assignedTo ?? null,
            orderId: order.id,
            items: { create: items },
          },
          include: { items: true },
        });
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
    .input(z.object({ pickListId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const pickList = await ctx.db.pickList.findFirst({
        where: { id: input.pickListId, accountId },
        include: {
          order: true,
          items: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, barcode: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!pickList) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pick list not found.",
        });
      }
      return pickList;
    }),

  scan: protectedProc
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
        pickListItemId: z.string().cuid(),
        scannedBarcode: z.string().trim().min(1),
        qty: z.number().int().positive(),
        overrideMismatch: z.boolean().optional(),
        auditNote: z.string().trim().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.$transaction(async (tx) => {
        const item = await tx.pickListItem.findFirst({
          where: { id: input.pickListItemId, pickList: { accountId } },
          include: {
            pickList: true,
            product: { select: { id: true, barcode: true } },
            order: { include: { lines: true } },
          },
        });
        if (!item) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Pick list item not found.",
          });
        }
        if (item.pickList.status === "COMPLETED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Pick list is already completed.",
          });
        }
        const matches = item.product.barcode === input.scannedBarcode;
        if (!matches && !input.overrideMismatch) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Scanned barcode does not match expected product barcode.",
          });
        }
        if (!matches && !input.auditNote) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Override requires an audit note.",
          });
        }
        const remaining = item.requiredQty - item.pickedQty;
        if (input.qty > remaining) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Scanned quantity exceeds required quantity.",
          });
        }
        const nextPicked = item.pickedQty + input.qty;
        await tx.pickListItem.update({
          where: { id: item.id },
          data: {
            pickedQty: nextPicked,
            scannedAt: new Date(),
          },
        });
        const orderLine = item.order.lines.find(
          (line) => line.productId === item.productId,
        );
        if (!orderLine) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order line not found.",
          });
        }
        await tx.orderLine.update({
          where: { id: orderLine.id },
          data: { pickedQty: orderLine.pickedQty + input.qty },
        });

        const pickListItems = await tx.pickListItem.findMany({
          where: { pickListId: item.pickListId },
          select: { requiredQty: true, pickedQty: true },
        });
        const pending = pickListItems.filter(
          (pickItem) => pickItem.pickedQty < pickItem.requiredQty,
        ).length;
        const pickListStatus = pending === 0 ? "COMPLETED" : "IN_PROGRESS";
        await tx.pickList.update({
          where: { id: item.pickListId },
          data: {
            status: pickListStatus,
            startedAt: item.pickList.startedAt ?? new Date(),
            completedAt: pending === 0 ? new Date() : item.pickList.completedAt,
          },
        });
        if (pending === 0) {
          await tx.order.update({
            where: { id: item.orderId },
            data: { fulfillmentStatus: "PARTIALLY_FULFILLED" },
          });
        }
        return {
          pickListItemId: item.id,
          pickedQty: nextPicked,
          pickListStatus,
        };
      });
    }),
});

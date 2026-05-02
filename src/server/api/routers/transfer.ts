import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

const operatorRoles = requireRole(
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PLATFORM_ADMIN",
);

export const transferRouter = createTRPCRouter({
  list: protectedProc.use(operatorRoles).query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    return ctx.db.transferOrder.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      include: {
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
        lines: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
          },
        },
      },
    });
  }),

  getById: protectedProc
    .use(operatorRoles)
    .input(z.object({ transferId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const row = await ctx.db.transferOrder.findFirst({
        where: { id: input.transferId, accountId },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          lines: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
            },
          },
        },
      });
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer not found.",
        });
      }
      return row;
    }),

  create: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        fromWarehouseId: z.string().cuid(),
        toWarehouseId: z.string().cuid(),
        lines: z
          .array(
            z.object({
              productId: z.string().cuid(),
              requestedQty: z.number().int().positive(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      if (input.fromWarehouseId === input.toWarehouseId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Source and destination warehouses must differ.",
        });
      }
      const profile = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
      });
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account profile not found.",
        });
      }
      const [fromW, toW] = await Promise.all([
        ctx.db.warehouse.findFirst({
          where: { id: input.fromWarehouseId, accountId },
        }),
        ctx.db.warehouse.findFirst({
          where: { id: input.toWarehouseId, accountId },
        }),
      ]);
      if (!fromW || !toW) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Warehouse not found.",
        });
      }
      const productIds = [...new Set(input.lines.map((l) => l.productId))];
      const products = await ctx.db.product.findMany({
        where: { id: { in: productIds }, accountId },
      });
      if (products.length !== productIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more products were not found.",
        });
      }

      const year = new Date().getFullYear();
      return ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${`to_seq:${accountId}:${year}`}));
        `;
        const nextSeqRows = await tx.$queryRaw<{ next_seq: number }[]>`
          SELECT COALESCE(MAX(CAST(split_part("toNumber", '-', 3) AS INTEGER)), 0) + 1 AS next_seq
          FROM transfer_order
          WHERE "accountId" = ${accountId}
            AND "toNumber" LIKE ${`TO-${year}-%`}
        `;
        const nextSeq = nextSeqRows[0]?.next_seq ?? 1;
        const toNumber = `TO-${year}-${String(nextSeq).padStart(6, "0")}`;

        return tx.transferOrder.create({
          data: {
            accountId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            toNumber,
            requestedBy: profile.id,
            lines: {
              create: input.lines.map((l) => ({
                productId: l.productId,
                requestedQty: l.requestedQty,
              })),
            },
          },
          include: {
            lines: { include: { product: true } },
            fromWarehouse: { select: { name: true, code: true } },
            toWarehouse: { select: { name: true, code: true } },
          },
        });
      });
    }),

  ship: protectedProc
    .use(operatorRoles)
    .input(z.object({ transferId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const transfer = await ctx.db.transferOrder.findFirst({
        where: { id: input.transferId, accountId },
        include: {
          lines: { include: { product: { select: { lotTracking: true } } } },
        },
      });
      if (!transfer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transfer not found." });
      }
      if (transfer.status !== "PENDING") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Transfer cannot be shipped in its current status.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        for (const line of transfer.lines) {
          const remaining =
            line.requestedQty - line.shippedQty;
          if (remaining <= 0) {
            continue;
          }
          let left = remaining;
          const stocks = await tx.stockLevel.findMany({
            where: {
              accountId,
              warehouseId: transfer.fromWarehouseId,
              productId: line.productId,
              quantity: { gt: 0 },
            },
            include: {
              bin: { select: { id: true } },
            },
            orderBy: line.product.lotTracking
              ? [{ expiryDate: "asc" }, { quantity: "desc" }]
              : [{ createdAt: "asc" }, { quantity: "desc" }],
          });

          for (const sl of stocks) {
            if (left <= 0) {
              break;
            }
            const available = sl.quantity - sl.reservedQty;
            if (available <= 0) {
              continue;
            }
            const take = Math.min(left, available);
            const quantityBefore = sl.quantity;
            const quantityAfter = sl.quantity - take;
            await tx.stockLevel.update({
              where: { id: sl.id },
              data: { quantity: quantityAfter },
            });
            await tx.stockMovement.create({
              data: {
                accountId,
                productId: line.productId,
                warehouseId: transfer.fromWarehouseId,
                binId: sl.binId,
                type: "OUTBOUND",
                quantityDelta: -take,
                quantityBefore,
                quantityAfter,
                referenceId: line.id,
                referenceType: "TRANSFER_ORDER_LINE",
                reason: `transfer_ship:${transfer.toNumber}`,
                performedBy: userId,
              },
            });
            left -= take;
          }

          if (left > 0) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Insufficient stock to ship line for product ${line.productId}.`,
            });
          }

          await tx.transferOrderLine.update({
            where: { id: line.id },
            data: { shippedQty: line.requestedQty },
          });
        }

        return tx.transferOrder.update({
          where: { id: transfer.id },
          data: { status: "SHIPPED" },
          include: {
            lines: { include: { product: true } },
            fromWarehouse: true,
            toWarehouse: true,
          },
        });
      });
    }),

  receive: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        transferId: z.string().cuid(),
        lines: z
          .array(
            z.object({
              lineId: z.string().cuid(),
              qty: z.number().int().positive(),
              toBinId: z.string().cuid(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const transfer = await ctx.db.transferOrder.findFirst({
        where: { id: input.transferId, accountId },
        include: {
          lines: { include: { product: { select: { lotTracking: true } } } },
        },
      });
      if (!transfer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transfer not found." });
      }
      if (transfer.status !== "SHIPPED" && transfer.status !== "PARTIALLY_RECEIVED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Transfer must be shipped before receiving.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        for (const row of input.lines) {
          const line = transfer.lines.find((l) => l.id === row.lineId);
          if (!line) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Transfer line not found.",
            });
          }
          const bin = await tx.bin.findFirst({
            where: {
              id: row.toBinId,
              warehouseId: transfer.toWarehouseId,
              warehouse: { accountId },
            },
          });
          if (!bin) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Destination bin not found in target warehouse.",
            });
          }
          const maxReceive = line.shippedQty - line.receivedQty;
          if (row.qty > maxReceive) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Receive quantity exceeds shipped quantity for a line.",
            });
          }

          const existing = await tx.stockLevel.findFirst({
            where: {
              accountId,
              productId: line.productId,
              binId: row.toBinId,
              lotNumber: null,
              serialNumber: null,
            },
          });
          const quantityBefore = existing?.quantity ?? 0;
          const quantityAfter = quantityBefore + row.qty;
          if (existing) {
            await tx.stockLevel.update({
              where: { id: existing.id },
              data: { quantity: quantityAfter },
            });
          } else {
            await tx.stockLevel.create({
              data: {
                accountId,
                productId: line.productId,
                binId: row.toBinId,
                warehouseId: transfer.toWarehouseId,
                quantity: row.qty,
                reservedQty: 0,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              accountId,
              productId: line.productId,
              warehouseId: transfer.toWarehouseId,
              binId: row.toBinId,
              type: "INBOUND",
              quantityDelta: row.qty,
              quantityBefore,
              quantityAfter,
              referenceId: line.id,
              referenceType: "TRANSFER_ORDER_LINE",
              reason: `transfer_receive:${transfer.toNumber}`,
              performedBy: userId,
            },
          });

          await tx.transferOrderLine.update({
            where: { id: line.id },
            data: { receivedQty: { increment: row.qty } },
          });
        }

        const freshLines = await tx.transferOrderLine.findMany({
          where: { transferId: transfer.id },
        });
        const allReceived = freshLines.every(
          (l) => l.shippedQty > 0 && l.receivedQty >= l.shippedQty,
        );
        const anyReceived = freshLines.some((l) => l.receivedQty > 0);

        return tx.transferOrder.update({
          where: { id: transfer.id },
          data: {
            status: allReceived
              ? "RECEIVED"
              : anyReceived
                ? "PARTIALLY_RECEIVED"
                : transfer.status,
            completedAt: allReceived ? new Date() : null,
          },
          include: {
            lines: { include: { product: true } },
            fromWarehouse: true,
            toWarehouse: true,
          },
        });
      });
    }),
});

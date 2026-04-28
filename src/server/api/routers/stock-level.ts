import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

const adjustInput = z.object({
  productId: z.string().cuid(),
  binId: z.string().cuid(),
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, "Delta must be non-zero."),
  reason: z.string().min(1).optional(),
  overrideNegative: z.boolean().optional(),
  lotNumber: z.string().min(1).optional(),
  serialNumber: z.string().min(1).optional(),
  expiryDate: z.coerce.date().optional(),
});

export const stockLevelRouter = createTRPCRouter({
  locations: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ warehouseId: z.string().cuid().optional() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const zones = await ctx.db.zone.findMany({
        where: {
          warehouse: {
            accountId,
            ...(input.warehouseId ? { id: input.warehouseId } : {}),
          },
        },
        include: {
          bins: {
            include: {
              stockLevels: {
                where: { accountId },
                select: {
                  quantity: true,
                  productId: true,
                },
              },
            },
            orderBy: { label: "asc" },
          },
        },
        orderBy: [{ warehouseId: "asc" }, { code: "asc" }],
      });

      return zones.map((zone) => ({
        id: zone.id,
        code: zone.code,
        name: zone.name,
        warehouseId: zone.warehouseId,
        bins: zone.bins.map((bin) => ({
          id: bin.id,
          label: bin.label,
          skuCount: new Set(bin.stockLevels.map((row) => row.productId)).size,
          units: bin.stockLevels.reduce((sum, row) => sum + row.quantity, 0),
        })),
      }));
    }),

  recentMovements: protectedProc
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
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.stockMovement.findMany({
        where: {
          accountId,
          ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  getByProduct: protectedProc
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
        productId: z.string().cuid(),
        warehouseId: z.string().cuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, accountId },
        select: { id: true },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      const rows = await ctx.db.stockLevel.findMany({
        where: {
          accountId,
          productId: input.productId,
          ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
        },
        include: {
          bin: {
            select: {
              id: true,
              label: true,
              aisle: true,
              rack: true,
              level: true,
              position: true,
            },
          },
        },
        orderBy: [{ warehouseId: "asc" }, { updatedAt: "desc" }],
      });

      return rows.map((row) => ({
        ...row,
        availableQty: row.quantity - row.reservedQty,
      }));
    }),

  adjust: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(adjustInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);

      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, accountId },
        select: { id: true, lotTracking: true },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }
      if (product.lotTracking && !input.lotNumber) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Lot number is required for lot-tracked products.",
        });
      }

      const bin = await ctx.db.bin.findFirst({
        where: { id: input.binId, warehouse: { accountId } },
        select: { id: true, warehouseId: true },
      });
      if (!bin) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bin not found." });
      }

      return ctx.db.$transaction(async (tx) => {
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            accountId,
            productId: input.productId,
            binId: input.binId,
            lotNumber: input.lotNumber ?? null,
            serialNumber: input.serialNumber ?? null,
          },
        });

        const quantityBefore = stockLevel?.quantity ?? 0;
        const quantityAfter = quantityBefore + input.delta;

        if (quantityAfter < 0 && !input.overrideNegative) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Stock adjustment would result in negative quantity. Pass overrideNegative to allow.",
          });
        }

        const updated = stockLevel
          ? await tx.stockLevel.update({
              where: { id: stockLevel.id },
              data: {
                quantity: quantityAfter,
                expiryDate: input.expiryDate ?? stockLevel.expiryDate,
              },
            })
          : await tx.stockLevel.create({
              data: {
                accountId,
                productId: input.productId,
                binId: input.binId,
                warehouseId: bin.warehouseId,
                quantity: quantityAfter,
                reservedQty: 0,
                lotNumber: input.lotNumber ?? null,
                serialNumber: input.serialNumber ?? null,
                expiryDate: input.expiryDate ?? null,
              },
            });

        await tx.stockMovement.create({
          data: {
            accountId,
            productId: input.productId,
            warehouseId: bin.warehouseId,
            binId: input.binId,
            type: "ADJUSTMENT",
            quantityDelta: input.delta,
            quantityBefore,
            quantityAfter,
            lotNumber: input.lotNumber ?? null,
            reason: input.reason ?? "manual_adjustment",
            performedBy: userId,
          },
        });

        return {
          stockLevel: updated,
          availableQty: updated.quantity - updated.reservedQty,
        };
      });
    }),

  transfer: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        productId: z.string().cuid(),
        fromBinId: z.string().cuid(),
        toBinId: z.string().cuid(),
        qty: z.number().int().positive(),
        reason: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);

      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, accountId },
        select: { id: true },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      const [fromBin, toBin] = await ctx.db.$transaction([
        ctx.db.bin.findFirst({
          where: { id: input.fromBinId, warehouse: { accountId } },
          select: { id: true, warehouseId: true },
        }),
        ctx.db.bin.findFirst({
          where: { id: input.toBinId, warehouse: { accountId } },
          select: { id: true, warehouseId: true },
        }),
      ]);

      if (!fromBin || !toBin) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more bins were not found.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const source = await tx.stockLevel.findFirst({
          where: {
            accountId,
            productId: input.productId,
            binId: input.fromBinId,
          },
          orderBy: { updatedAt: "asc" },
        });

        if (!source || source.quantity < input.qty) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Insufficient quantity in source bin.",
          });
        }

        const destination = await tx.stockLevel.findFirst({
          where: {
            accountId,
            productId: input.productId,
            binId: input.toBinId,
            lotNumber: source.lotNumber,
            serialNumber: source.serialNumber,
          },
        });

        const sourceAfter = source.quantity - input.qty;
        const destinationBefore = destination?.quantity ?? 0;
        const destinationAfter = destinationBefore + input.qty;

        await tx.stockLevel.update({
          where: { id: source.id },
          data: { quantity: sourceAfter },
        });

        if (destination) {
          await tx.stockLevel.update({
            where: { id: destination.id },
            data: { quantity: destinationAfter },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              accountId,
              productId: input.productId,
              binId: input.toBinId,
              warehouseId: toBin.warehouseId,
              quantity: destinationAfter,
              reservedQty: 0,
              lotNumber: source.lotNumber,
              serialNumber: source.serialNumber,
              expiryDate: source.expiryDate,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            accountId,
            productId: input.productId,
            warehouseId: fromBin.warehouseId,
            binId: input.fromBinId,
            type: "TRANSFER",
            quantityDelta: -input.qty,
            quantityBefore: source.quantity,
            quantityAfter: sourceAfter,
            lotNumber: source.lotNumber,
            reason: input.reason ?? "bin_transfer_out",
            performedBy: userId,
            referenceType: "BIN_TRANSFER",
          },
        });

        await tx.stockMovement.create({
          data: {
            accountId,
            productId: input.productId,
            warehouseId: toBin.warehouseId,
            binId: input.toBinId,
            type: "TRANSFER",
            quantityDelta: input.qty,
            quantityBefore: destinationBefore,
            quantityAfter: destinationAfter,
            lotNumber: source.lotNumber,
            reason: input.reason ?? "bin_transfer_in",
            performedBy: userId,
            referenceType: "BIN_TRANSFER",
          },
        });

        return {
          fromBinId: input.fromBinId,
          toBinId: input.toBinId,
          quantity: input.qty,
        };
      });
    }),
});

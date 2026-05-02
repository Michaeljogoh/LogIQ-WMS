import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { tryGenerateDefaultProductLabel } from "@/server/label/persist";

const productCreateInput = z.object({
  merchantId: z.string().cuid(),
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().min(1).optional().nullable(),
  weightOz: z.number().positive().optional().nullable(),
  lengthIn: z.number().positive().optional().nullable(),
  widthIn: z.number().positive().optional().nullable(),
  heightIn: z.number().positive().optional().nullable(),
  lotTracking: z.boolean().optional(),
  serialTracking: z.boolean().optional(),
  expiryTracking: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).optional().nullable(),
});

const productUpdateInput = z.object({
  productId: z.string().cuid(),
  name: z.string().min(1).optional(),
  barcode: z.string().min(1).nullable().optional(),
  weightOz: z.number().positive().nullable().optional(),
  lengthIn: z.number().positive().nullable().optional(),
  widthIn: z.number().positive().nullable().optional(),
  heightIn: z.number().positive().nullable().optional(),
  lotTracking: z.boolean().optional(),
  serialTracking: z.boolean().optional(),
  expiryTracking: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  deadStockDays: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const productRouter = createTRPCRouter({
  create: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(productCreateInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);

      const merchant = await ctx.db.merchant.findFirst({
        where: { id: input.merchantId, accountId },
        select: { id: true },
      });
      if (!merchant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found.",
        });
      }

      try {
        const created = await ctx.db.product.create({
          data: {
            accountId,
            merchantId: input.merchantId,
            name: input.name,
            sku: input.sku,
            barcode: input.barcode ?? null,
            weightOz: input.weightOz ?? null,
            lengthIn: input.lengthIn ?? null,
            widthIn: input.widthIn ?? null,
            heightIn: input.heightIn ?? null,
            lotTracking: input.lotTracking ?? false,
            serialTracking: input.serialTracking ?? false,
            expiryTracking: input.expiryTracking ?? false,
            lowStockThreshold: input.lowStockThreshold ?? null,
          },
        });
        void tryGenerateDefaultProductLabel(ctx.db, accountId, created.id);
        return created;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error) {
          const prismaError = error as { code?: string };
          if (prismaError.code === "P2002") {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "A product with this SKU already exists for this merchant.",
            });
          }
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  update: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(productUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const { productId, ...data } = input;

      const existing = await ctx.db.product.findFirst({
        where: { id: productId, accountId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      return ctx.db.product.update({
        where: { id: productId },
        data,
      });
    }),

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
        merchantId: z.string().cuid().optional(),
        search: z.string().trim().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const skip = (input.page - 1) * input.limit;

      const where = {
        accountId,
        ...(input.merchantId ? { merchantId: input.merchantId } : {}),
        ...(input.search
          ? {
              OR: [
                {
                  name: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  sku: { contains: input.search, mode: "insensitive" as const },
                },
                {
                  barcode: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      };

      const [items, total] = await ctx.db.$transaction([
        ctx.db.product.findMany({
          where,
          include: {
            merchant: { select: { id: true, name: true } },
            stockLevels: {
              select: { quantity: true, reservedQty: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.limit,
        }),
        ctx.db.product.count({ where }),
      ]);

      return {
        items: items.map((item) => {
          const quantity = item.stockLevels.reduce(
            (sum, row) => sum + row.quantity,
            0,
          );
          const reservedQty = item.stockLevels.reduce(
            (sum, row) => sum + row.reservedQty,
            0,
          );
          return {
            ...item,
            totalQuantity: quantity,
            totalReservedQty: reservedQty,
            totalAvailableQty: quantity - reservedQty,
          };
        }),
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
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
    .input(z.object({ productId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, accountId },
        include: {
          merchant: { select: { id: true, name: true } },
          stockLevels: {
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
            orderBy: { updatedAt: "desc" },
          },
          movements: {
            where: { accountId },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      return product;
    }),
});

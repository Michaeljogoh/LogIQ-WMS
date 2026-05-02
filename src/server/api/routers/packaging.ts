import { TRPCError } from "@trpc/server";
import { endOfMonth, startOfMonth } from "date-fns";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import {
  aggregateOrderLinesForPackaging,
  enrichSuggestionsWithDim,
} from "@/server/packaging/suggest-packaging";

const operatorRoles = requireRole(
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PLATFORM_ADMIN",
);

export const packagingRouter = createTRPCRouter({
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
        name: z.string().min(1),
        lengthIn: z.number().positive(),
        widthIn: z.number().positive(),
        heightIn: z.number().positive(),
        maxWeightOz: z.number().positive(),
        tareWeightOz: z.number().nonnegative().default(0),
        costCents: z.number().int().nonnegative().default(0),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.packagingType.create({
        data: {
          accountId,
          name: input.name,
          lengthIn: input.lengthIn,
          widthIn: input.widthIn,
          heightIn: input.heightIn,
          maxWeightOz: input.maxWeightOz,
          tareWeightOz: input.tareWeightOz,
          costCents: input.costCents,
          isActive: input.isActive ?? true,
        },
      });
    }),

  list: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        includeInactive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.packagingType.findMany({
        where: {
          accountId,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        orderBy: [{ lengthIn: "asc" }, { name: "asc" }],
      });
    }),

  suggest: protectedProc
    .use(operatorRoles)
    .input(z.object({ orderId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, accountId },
        include: {
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  weightOz: true,
                  lengthIn: true,
                  widthIn: true,
                  heightIn: true,
                },
              },
            },
          },
        },
      });
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }

      const { totalVolumeIn3, totalWeightOz } = aggregateOrderLinesForPackaging(
        order.lines,
      );

      const boxes = await ctx.db.packagingType.findMany({
        where: {
          accountId,
          isActive: true,
        },
        orderBy: [{ lengthIn: "asc" }],
      });

      const fitting = boxes.filter(
        (b) =>
          b.maxWeightOz >= totalWeightOz + b.tareWeightOz &&
          b.lengthIn * b.widthIn * b.heightIn >= totalVolumeIn3,
      );
      const top3 = fitting.slice(0, 3);
      const suggestions = enrichSuggestionsWithDim(top3, totalWeightOz);

      return {
        itemsWeightOz: Math.round(totalWeightOz * 100) / 100,
        totalVolumeIn3: Math.round(totalVolumeIn3 * 1000) / 1000,
        suggestions,
      };
    }),

  costReport: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const start = startOfMonth(new Date(input.year, input.month - 1, 1));
      const end = endOfMonth(start);

      const shipments = await ctx.db.shipment.findMany({
        where: {
          accountId,
          createdAt: { gte: start, lte: end },
          packagingTypeId: { not: null },
        },
        select: {
          packagingCostCents: true,
          order: { select: { merchantId: true } },
        },
      });

      const byMerchant = new Map<
        string,
        { totalPackagingCostCents: number; shipmentCount: number }
      >();

      for (const s of shipments) {
        const mid = s.order.merchantId;
        const cost = s.packagingCostCents ?? 0;
        const prev = byMerchant.get(mid) ?? {
          totalPackagingCostCents: 0,
          shipmentCount: 0,
        };
        prev.totalPackagingCostCents += cost;
        prev.shipmentCount += 1;
        byMerchant.set(mid, prev);
      }

      const merchants = await ctx.db.merchant.findMany({
        where: { accountId, id: { in: [...byMerchant.keys()] } },
        select: { id: true, name: true },
      });
      const nameById = new Map(merchants.map((m) => [m.id, m.name]));

      return {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        rows: [...byMerchant.entries()].map(([merchantId, agg]) => ({
          merchantId,
          merchantName: nameById.get(merchantId) ?? merchantId,
          totalPackagingCostCents: agg.totalPackagingCostCents,
          shipmentCount: agg.shipmentCount,
        })),
      };
    }),
});

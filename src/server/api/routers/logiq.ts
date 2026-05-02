import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { runNLQuery } from "@/server/ai/query-engine";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { setCache } from "@/server/cache/analytics-cache";
import { logiqQueue } from "@/server/jobs/queues";
import {
  computeCapacityForecastForWarehouse,
  readCapacityForecastFromCache,
} from "@/server/logiq/capacity-forecast";
import {
  CAPACITY_CACHE_TTL_SECONDS,
  capacityCacheKey,
} from "@/server/logiq/constants";

const operatorRoles = [
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "PLATFORM_ADMIN",
] as const;

export const logiqRouter = createTRPCRouter({
  query: protectedProc
    .use(requireRole(...operatorRoles))
    .input(z.object({ text: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const warehouseIds =
        ctx.systemRole === "WAREHOUSE_MANAGER"
          ? ctx.managedWarehouseIds
          : undefined;

      let result: Awaited<ReturnType<typeof runNLQuery>>;
      let errorMessage: string | null = null;
      try {
        result = await runNLQuery(ctx.db, accountId, input.text, {
          warehouseIds:
            warehouseIds && warehouseIds.length > 0 ? warehouseIds : undefined,
        });
      } catch (e) {
        if (e instanceof TRPCError) {
          errorMessage = e.message;
          await ctx.db.logIQQuery.create({
            data: {
              accountId,
              userId,
              queryText: input.text,
              explanation: null,
              chartType: null,
              rowCount: null,
              error: errorMessage,
            },
          });
          throw e;
        }
        errorMessage = e instanceof Error ? e.message : "Query failed";
        result = {
          explanation: errorMessage,
          chartType: null,
          data: null,
        };
      }

      await ctx.db.logIQQuery.create({
        data: {
          accountId,
          userId,
          queryText: input.text,
          explanation: result.explanation,
          chartType: result.chartType,
          rowCount: result.data?.length ?? null,
          error: errorMessage,
        },
      });

      if (errorMessage && !result.data) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errorMessage,
        });
      }

      return result;
    }),

  getInsights: protectedProc
    .use(requireRole(...operatorRoles))
    .input(
      z.object({
        severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
        warehouseId: z.string().cuid().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const take = input.limit + 1;

      const wmFilter =
        ctx.systemRole === "WAREHOUSE_MANAGER"
          ? {
              OR: [
                { warehouseId: null },
                { warehouseId: { in: ctx.managedWarehouseIds } },
              ],
            }
          : {};

      let cursorClause: Record<string, unknown> = {};
      if (input.cursor) {
        const cur = await ctx.db.logIQInsight.findFirst({
          where: { id: input.cursor, accountId },
          select: { createdAt: true, id: true },
        });
        if (cur) {
          cursorClause = {
            OR: [
              { createdAt: { lt: cur.createdAt } },
              {
                AND: [{ createdAt: cur.createdAt }, { id: { lt: cur.id } }],
              },
            ],
          };
        }
      }

      const rows = await ctx.db.logIQInsight.findMany({
        where: {
          accountId,
          acknowledgedAt: null,
          ...(input.severity ? { severity: input.severity } : {}),
          ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
          ...wmFilter,
          ...cursorClause,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      });

      let nextCursor: string | null = null;
      const items =
        rows.length > input.limit ? rows.slice(0, input.limit) : rows;
      if (items.length === input.limit && rows.length > input.limit) {
        nextCursor = items[items.length - 1]?.id ?? null;
      }

      return { items, nextCursor };
    }),

  acknowledgeInsight: protectedProc
    .use(requireRole(...operatorRoles))
    .input(z.object({ insightId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const accountUser = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
        select: { id: true },
      });
      const insight = await ctx.db.logIQInsight.findFirst({
        where: { id: input.insightId, accountId },
      });
      if (!insight) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Insight not found.",
        });
      }
      if (
        ctx.systemRole === "WAREHOUSE_MANAGER" &&
        insight.warehouseId &&
        !ctx.managedWarehouseIds.includes(insight.warehouseId)
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.logIQInsight.update({
        where: { id: insight.id },
        data: {
          acknowledgedAt: new Date(),
          acknowledgedBy: accountUser?.id ?? userId,
        },
      });
    }),

  getStockForecast: protectedProc
    .use(requireRole(...operatorRoles))
    .input(
      z.object({
        warehouseId: z.string().cuid().optional(),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const wm =
        ctx.systemRole === "WAREHOUSE_MANAGER"
          ? { warehouseId: { in: ctx.managedWarehouseIds } }
          : {};
      const wh = input.warehouseId ? { warehouseId: input.warehouseId } : {};
      if (
        input.warehouseId &&
        ctx.systemRole === "WAREHOUSE_MANAGER" &&
        !ctx.managedWarehouseIds.includes(input.warehouseId)
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.stockForecast.findMany({
        where: {
          accountId,
          ...wm,
          ...wh,
        },
        orderBy: { stockoutRisk: "desc" },
        take: input.limit,
        include: {
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      });
    }),

  getCarrierScorecards: protectedProc
    .use(requireRole(...operatorRoles))
    .input(
      z.object({
        carrier: z.string().optional(),
        weightTier: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.carrierScorecard.findMany({
        where: {
          accountId,
          ...(input.carrier ? { carrier: input.carrier } : {}),
          ...(input.weightTier ? { weightTier: input.weightTier } : {}),
        },
        orderBy: { score: "desc" },
        take: input.limit,
      });
    }),

  getCapacityForecast: protectedProc
    .use(requireRole(...operatorRoles))
    .input(z.object({ warehouseId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      if (
        ctx.systemRole === "WAREHOUSE_MANAGER" &&
        !ctx.managedWarehouseIds.includes(input.warehouseId)
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const cached = await readCapacityForecastFromCache(
        accountId,
        input.warehouseId,
      );
      if (cached) {
        return cached;
      }
      const computed = await computeCapacityForecastForWarehouse({
        accountId,
        warehouseId: input.warehouseId,
      });
      await setCache(
        capacityCacheKey(accountId, input.warehouseId),
        computed,
        CAPACITY_CACHE_TTL_SECONDS,
      );
      return computed;
    }),

  /** Enqueues background scan jobs (processed inline via logiqQueue in this codebase). */
  runJobs: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .input(
      z.object({
        jobs: z
          .array(
            z.enum([
              "stockout",
              "overstock",
              "carrierScorecard",
              "capacity",
              "pickRate",
              "digest",
            ]),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      for (const j of input.jobs) {
        if (j === "stockout") {
          await logiqQueue.add("logiq.stockoutScan", { accountId });
        } else if (j === "overstock") {
          await logiqQueue.add("logiq.overstockScan", { accountId });
        } else if (j === "carrierScorecard") {
          await logiqQueue.add("logiq.carrierScorecard", { accountId });
        } else if (j === "capacity") {
          await logiqQueue.add("logiq.capacityForecast", { accountId });
        } else if (j === "pickRate") {
          await logiqQueue.add("logiq.pickRateScan", { accountId });
        } else if (j === "digest") {
          await logiqQueue.add("logiq.insightDigest", { accountId });
        }
      }
      return { ok: true as const };
    }),
});

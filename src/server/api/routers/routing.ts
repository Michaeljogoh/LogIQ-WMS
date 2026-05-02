import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import type { Prisma } from "@/generated/prisma/client";
import { routeOrderEngine } from "@/server/routing/route-order";

const operatorRoles = requireRole(
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "PLATFORM_ADMIN",
);

const conditionSchema = z.array(
  z.object({
    field: z.enum(["destinationState", "orderValue", "carrier", "sku"]),
    operator: z.enum(["eq", "in", "gte", "lte"]),
    value: z.unknown(),
  }),
);

const routingRulesRouter = createTRPCRouter({
  list: protectedProc.use(operatorRoles).query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    return ctx.db.routingRule.findMany({
      where: { accountId },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: {
        merchant: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });
  }),

  upsert: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        id: z.string().cuid().optional(),
        name: z.string().min(1),
        priority: z.number().int(),
        merchantId: z.string().cuid().nullable().optional(),
        conditions: z.unknown(),
        action: z.enum([
          "ASSIGN_TO_WAREHOUSE",
          "ASSIGN_NEAREST",
          "SPLIT_SHIPMENT",
          "HOLD_FOR_STOCK",
        ]),
        warehouseId: z.string().cuid().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const parsed = conditionSchema.safeParse(input.conditions);
      if (!parsed.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid conditions JSON shape.",
        });
      }
      if (
        input.action === "ASSIGN_TO_WAREHOUSE" &&
        !input.warehouseId
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "ASSIGN_TO_WAREHOUSE requires warehouseId.",
        });
      }
      if (input.merchantId) {
        const m = await ctx.db.merchant.findFirst({
          where: { id: input.merchantId, accountId },
        });
        if (!m) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found." });
        }
      }
      if (input.warehouseId) {
        const w = await ctx.db.warehouse.findFirst({
          where: { id: input.warehouseId, accountId },
        });
        if (!w) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Warehouse not found." });
        }
      }

      if (input.id) {
        const existing = await ctx.db.routingRule.findFirst({
          where: { id: input.id, accountId },
        });
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found." });
        }
        return ctx.db.routingRule.update({
          where: { id: input.id },
          data: {
            name: input.name,
            priority: input.priority,
            merchantId: input.merchantId ?? null,
            conditions: parsed.data as Prisma.InputJsonValue,
            action: input.action,
            warehouseId: input.warehouseId ?? null,
            isActive: input.isActive ?? true,
          },
        });
      }

      return ctx.db.routingRule.create({
        data: {
          accountId,
          name: input.name,
          priority: input.priority,
          merchantId: input.merchantId ?? null,
          conditions: parsed.data as Prisma.InputJsonValue,
          action: input.action,
          warehouseId: input.warehouseId ?? null,
          isActive: input.isActive ?? true,
        },
      });
    }),

  reorder: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        orderedRuleIds: z.array(z.string().cuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const rules = await ctx.db.routingRule.findMany({
        where: { accountId, id: { in: input.orderedRuleIds } },
        select: { id: true },
      });
      if (rules.length !== input.orderedRuleIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more rules were not found.",
        });
      }
      const n = input.orderedRuleIds.length;
      await ctx.db.$transaction(
        input.orderedRuleIds.map((id, idx) =>
          ctx.db.routingRule.update({
            where: { id },
            data: { priority: (n - idx) * 10 },
          }),
        ),
      );
      return ctx.db.routingRule.findMany({
        where: { accountId },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      });
    }),
});

export const routingRouter = createTRPCRouter({
  rules: routingRulesRouter,
  route: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ orderId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      try {
        return await routeOrderEngine(ctx.db, accountId, input.orderId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Routing failed.";
        throw new TRPCError({
          code:
            msg.includes("not found") || msg.includes("Not found")
              ? "NOT_FOUND"
              : msg.includes("pick list")
                ? "PRECONDITION_FAILED"
                : "INTERNAL_SERVER_ERROR",
          message: msg,
        });
      }
    }),
});

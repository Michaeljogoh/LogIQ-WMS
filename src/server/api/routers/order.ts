import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { shouldMeterOrderOverage } from "@/server/billing/plan-limits";
import { scheduleOverageOrderMeter } from "@/server/billing/usage-ingest";

const createOrderInput = z.object({
  merchantId: z.string().cuid(),
  channelOrderId: z.string().min(1),
  channel: z.string().min(1),
  shippingName: z.string().min(1),
  shippingLine1: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingState: z.string().min(1),
  shippingZip: z.string().min(1),
  shippingCountry: z.string().min(1).default("US"),
  slaHours: z.number().int().positive().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const orderRouter = createTRPCRouter({
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
        tab: z.enum(["UNFULFILLED", "DUE_TODAY", "ALL"]).default("ALL"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return ctx.db.order.findMany({
        where: {
          accountId,
          ...(input.tab === "UNFULFILLED"
            ? { fulfillmentStatus: { not: "FULFILLED" } }
            : {}),
          ...(input.tab === "DUE_TODAY"
            ? { dueAt: { gte: start, lte: end }, status: "PENDING" }
            : {}),
        },
        include: {
          merchant: { select: { id: true, name: true } },
          pickList: { select: { id: true, status: true } },
          _count: { select: { lines: true, shipments: true } },
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
    .input(z.object({ orderId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, accountId },
        include: {
          merchant: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, barcode: true },
              },
            },
          },
          pickList: {
            include: {
              items: true,
            },
          },
          shipments: {
            include: {
              trackingEvents: { orderBy: { eventAt: "asc" } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }
      return order;
    }),

  create: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(createOrderInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const productIds = [
        ...new Set(input.lines.map((line) => line.productId)),
      ];
      const products = await ctx.db.product.findMany({
        where: {
          accountId,
          merchantId: input.merchantId,
          id: { in: productIds },
        },
        select: { id: true, sku: true },
      });
      if (products.length !== productIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more order products were not found.",
        });
      }
      const skuByProductId = new Map(products.map((p) => [p.id, p.sku]));
      try {
        const created = await ctx.db.$transaction(async (tx) => {
          const markOverage = await shouldMeterOrderOverage(tx, accountId);
          const order = await tx.order.create({
            data: {
              accountId,
              merchantId: input.merchantId,
              channelOrderId: input.channelOrderId,
              channel: input.channel,
              shippingName: input.shippingName,
              shippingLine1: input.shippingLine1,
              shippingCity: input.shippingCity,
              shippingState: input.shippingState,
              shippingZip: input.shippingZip,
              shippingCountry: input.shippingCountry,
              slaHours: input.slaHours,
              dueAt:
                typeof input.slaHours === "number"
                  ? new Date(Date.now() + input.slaHours * 60 * 60 * 1000)
                  : null,
              lines: {
                create: input.lines.map((line) => ({
                  productId: line.productId,
                  sku: skuByProductId.get(line.productId) ?? "UNKNOWN",
                  quantity: line.quantity,
                })),
              },
            },
            include: { lines: true },
          });
          return { order, markOverage };
        });
        if (created.markOverage) {
          scheduleOverageOrderMeter(accountId, created.order.id);
        }
        return created.order;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error) {
          const prismaError = error as { code?: string };
          if (prismaError.code === "P2002") {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "An order with this channel id already exists for this account.",
            });
          }
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  bulkSetStatus: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        orderIds: z.array(z.string().cuid()).min(1),
        status: z.enum(["PENDING", "ON_HOLD", "CANCELLED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const result = await ctx.db.order.updateMany({
        where: { id: { in: input.orderIds }, accountId },
        data: { status: input.status },
      });
      return { updated: result.count };
    }),
});

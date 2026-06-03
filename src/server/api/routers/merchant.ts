import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { assertWithinMerchantLimit } from "@/server/billing/plan-limits";
import { getOrSetCache } from "@/server/cache/analytics-cache";
import { inviteMerchantUser } from "@/server/helpers/merchant-team-invite";

const DAY_MS = 24 * 60 * 60 * 1000;
const PORTAL_TREND_DAYS = 14;

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function toIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: Date, to: Date) {
  const list: Date[] = [];
  let cursor = startOfUtcDay(from).getTime();
  const end = endOfUtcDay(to).getTime();
  while (cursor <= end) {
    list.push(new Date(cursor));
    cursor += DAY_MS;
  }
  return list;
}

function formatFulfillmentLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const merchantRouter = createTRPCRouter({
  list: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.merchant.findMany({
        where: { accountId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      });
    }),

  create: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const account = await ctx.db.logiqAccount.findUniqueOrThrow({
        where: { id: accountId },
        select: { plan: true },
      });
      await assertWithinMerchantLimit(ctx.db, accountId, account.plan);
      let inviter = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
      });
      if (!inviter && ctx.systemRole === "PLATFORM_ADMIN") {
        inviter = await ctx.db.accountUser.findFirst({
          where: { accountId },
        });
      }
      if (!inviter) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Operator profile is not linked to this session.",
        });
      }

      const merchant = await ctx.db.merchant.create({
        data: {
          accountId,
          name: input.name,
          email: input.email,
        },
      });

      const merchantUser = await ctx.db.merchantUser.create({
        data: {
          accountId,
          merchantId: merchant.id,
          systemRole: "MERCHANT_OWNER",
          permissions: [],
          email: input.email,
          invitedBy: inviter.id,
        },
      });

      await inviteMerchantUser({
        accountId,
        merchantId: merchant.id,
        email: input.email,
        name: input.name,
        systemRole: "MERCHANT_OWNER",
        permissions: [],
        invitedBy: inviter.id,
        merchantUserId: merchantUser.id,
      });

      return { merchantId: merchant.id, merchantUserId: merchantUser.id };
    }),

  listWithMetrics: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const merchants = await ctx.db.merchant.findMany({
        where: { accountId },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
        },
      });

      const merchantIds = merchants.map((merchant) => merchant.id);
      const [orders, stock, invoices] = await ctx.db.$transaction([
        ctx.db.order.findMany({
          where: { accountId, merchantId: { in: merchantIds } },
          select: { merchantId: true, dueAt: true, fulfillmentStatus: true },
        }),
        ctx.db.stockLevel.findMany({
          where: {
            accountId,
            product: { merchantId: { in: merchantIds } },
          },
          include: {
            product: { select: { merchantId: true } },
          },
        }),
        ctx.db.invoice.findMany({
          where: { accountId, merchantId: { in: merchantIds } },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      const orderCountByMerchant = new Map<string, number>();
      for (const order of orders) {
        orderCountByMerchant.set(
          order.merchantId,
          (orderCountByMerchant.get(order.merchantId) ?? 0) + 1,
        );
      }

      return merchants.map((merchant) => {
        const orderCount = orderCountByMerchant.get(merchant.id) ?? 0;
        const merchantOrders = orders.filter(
          (order) => order.merchantId === merchant.id,
        );
        const slaOrders = merchantOrders.filter(
          (order) => order.dueAt !== null,
        );
        const slaMet = slaOrders.filter((order) => {
          if (!order.dueAt) {
            return false;
          }
          if (order.fulfillmentStatus === "FULFILLED") {
            return true;
          }
          return order.dueAt > new Date();
        }).length;
        const slaScore = slaOrders.length
          ? Math.round((slaMet / slaOrders.length) * 100)
          : 100;
        const inventoryValueCents = stock
          .filter((row) => row.product.merchantId === merchant.id)
          .reduce((sum, row) => sum + row.quantity * 100, 0);
        const latestInvoice = invoices.find(
          (invoice) => invoice.merchantId === merchant.id,
        );
        return {
          ...merchant,
          orderCount,
          inventoryValueCents,
          slaScore,
          latestInvoice: latestInvoice
            ? {
                id: latestInvoice.id,
                invoiceNumber: latestInvoice.invoiceNumber,
                totalCents: latestInvoice.totalCents,
                status: latestInvoice.status,
              }
            : null,
        };
      });
    }),

  portalDashboard: protectedProc
    .use(
      requireRole(
        "MERCHANT_OWNER",
        "MERCHANT_USER",
        "THREEPL_ACCOUNT_OWNER",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      if (!ctx.merchantId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Session is not linked to a merchant context.",
        });
      }
      const merchantId = ctx.merchantId;

      return getOrSetCache({
        key: `merchant:${accountId}:${merchantId}:portal-dashboard`,
        ttlSeconds: 300,
        compute: async () => {
          const now = new Date();
          const rangeStart = new Date(
            now.getTime() - (PORTAL_TREND_DAYS - 1) * DAY_MS,
          );
          const startDay = startOfUtcDay(rangeStart);
          const endDay = endOfUtcDay(now);

          const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);

          const [
            merchant,
            orderCount,
            activeSkuCount,
            stockAggregate,
            productsWithStock,
            recentShipments,
            latestInvoice,
            ordersInRange,
            openOrdersForMix,
            orders7d,
            integration,
          ] = await ctx.db.$transaction([
            ctx.db.merchant.findFirst({
              where: { id: merchantId, accountId },
              select: { name: true, email: true },
            }),
            ctx.db.order.count({
              where: {
                accountId,
                merchantId,
                fulfillmentStatus: { not: "FULFILLED" },
              },
            }),
            ctx.db.product.count({
              where: { accountId, merchantId, isActive: true },
            }),
            ctx.db.stockLevel.aggregate({
              where: {
                accountId,
                product: { merchantId, isActive: true },
              },
              _sum: { quantity: true },
            }),
            ctx.db.product.findMany({
              where: {
                accountId,
                merchantId,
                isActive: true,
                lowStockThreshold: { not: null },
              },
              select: {
                id: true,
                name: true,
                sku: true,
                lowStockThreshold: true,
                stockLevels: { select: { quantity: true } },
              },
            }),
            ctx.db.shipment.findMany({
              where: { accountId, order: { merchantId } },
              orderBy: { createdAt: "desc" },
              take: 5,
              select: {
                id: true,
                carrier: true,
                status: true,
                createdAt: true,
                order: { select: { channelOrderId: true } },
              },
            }),
            ctx.db.invoice.findFirst({
              where: { accountId, merchantId },
              orderBy: { createdAt: "desc" },
            }),
            ctx.db.order.findMany({
              where: {
                accountId,
                merchantId,
                createdAt: { gte: startDay, lte: endDay },
              },
              select: { createdAt: true, fulfillmentStatus: true },
            }),
            ctx.db.order.findMany({
              where: {
                accountId,
                merchantId,
                fulfillmentStatus: { not: "FULFILLED" },
              },
              select: { fulfillmentStatus: true },
            }),
            ctx.db.order.findMany({
              where: {
                accountId,
                merchantId,
                createdAt: { gte: sevenDaysAgo, lte: endDay },
              },
              select: { fulfillmentStatus: true },
            }),
            ctx.db.integration.findFirst({
              where: { accountId, merchantId },
              orderBy: { lastSyncAt: "desc" },
              select: {
                type: true,
                status: true,
                metadata: true,
                lastSyncAt: true,
              },
            }),
          ]);

          const lowStockItems = productsWithStock
            .map((product) => {
              const quantity = product.stockLevels.reduce(
                (sum, row) => sum + row.quantity,
                0,
              );
              const threshold = product.lowStockThreshold ?? 0;
              return {
                id: product.id,
                name: product.name,
                sku: product.sku,
                quantity,
                threshold,
              };
            })
            .filter((row) => row.quantity < row.threshold)
            .sort((a, b) => a.quantity - b.quantity)
            .slice(0, 6);

          const lowStockCount = lowStockItems.length;
          const totalSkus = activeSkuCount;
          const unitsOnHand = stockAggregate._sum.quantity ?? 0;

          const fulfilled7d = orders7d.filter(
            (o) => o.fulfillmentStatus === "FULFILLED",
          ).length;
          const fulfillmentRate7d =
            orders7d.length > 0
              ? Math.round((fulfilled7d / orders7d.length) * 10000) / 100
              : 0;

          const integrationMeta = integration?.metadata as
            | Record<string, unknown>
            | null
            | undefined;
          const shopDomain =
            typeof integrationMeta?.shopDomain === "string"
              ? integrationMeta.shopDomain
              : typeof integrationMeta?.siteUrl === "string"
                ? integrationMeta.siteUrl
                : null;

          const dayKeys = daysBetween(startDay, now).map(toIsoDay);
          const orderTrendMap = new Map(
            dayKeys.map((date) => [date, { date, orders: 0, shipped: 0 }]),
          );
          for (const order of ordersInRange) {
            const day = toIsoDay(order.createdAt);
            const row = orderTrendMap.get(day);
            if (row) {
              row.orders += 1;
              if (order.fulfillmentStatus === "FULFILLED") {
                row.shipped += 1;
              }
            }
          }

          const shipmentTrendMap = new Map(
            dayKeys.map((date) => [date, { date, shipments: 0 }]),
          );
          const shipmentsInRange = await ctx.db.shipment.findMany({
            where: {
              accountId,
              order: { merchantId },
              createdAt: { gte: startDay, lte: endDay },
            },
            select: { createdAt: true },
          });
          for (const shipment of shipmentsInRange) {
            const day = toIsoDay(shipment.createdAt);
            const row = shipmentTrendMap.get(day);
            if (row) row.shipments += 1;
          }

          return {
            periodDays: PORTAL_TREND_DAYS,
            merchantName: merchant?.name ?? "Your brand",
            merchantEmail: merchant?.email ?? null,
            openOrders: orderCount,
            lowStockCount,
            lowStockItems,
            totalSkus,
            unitsOnHand,
            fulfillmentRate7d,
            integration: integration
              ? {
                  type: integration.type,
                  status: integration.status,
                  shopDomain,
                  lastSyncAt: integration.lastSyncAt,
                }
              : null,
            recentShipments,
            latestInvoice,
            orderTrend: [...orderTrendMap.values()],
            shipmentTrend: [...shipmentTrendMap.values()],
            statusMix: (() => {
              const mix = new Map<string, number>();
              for (const order of openOrdersForMix) {
                mix.set(
                  order.fulfillmentStatus,
                  (mix.get(order.fulfillmentStatus) ?? 0) + 1,
                );
              }
              return [...mix.entries()].map(([status, value]) => ({
                name: formatFulfillmentLabel(status),
                value,
              }));
            })(),
          };
        },
      });
    }),

  getContract: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "MERCHANT_OWNER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ merchantId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.merchantContract.findFirst({
        where: { accountId, merchantId: input.merchantId },
        include: { feeRules: true, slaRules: true },
      });
    }),

  upsertContract: protectedProc
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
        paymentPeriod: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
        currency: z.string().min(3).max(3).default("USD"),
        startDate: z.coerce.date(),
        isActive: z.boolean().default(true),
        feeRules: z.array(
          z.object({
            feeType: z.enum([
              "STORAGE_PER_UNIT_DAY",
              "STORAGE_PER_PALLET_DAY",
              "PICK_INITIAL",
              "PICK_ADDITIONAL",
              "RECEIVING_PER_PO",
              "RECEIVING_PER_UNIT",
              "PACKING_PER_SHIPMENT",
              "LABEL_PER_SHIPMENT",
              "RETURN_PROCESSING",
              "SPECIAL_HANDLING",
            ]),
            rateCents: z.number().int().min(0),
            unitLabel: z.string().min(1),
            includedUnits: z.number().int().min(0).default(0),
          }),
        ),
        slaRules: z.array(
          z.object({
            metric: z.string().min(1),
            thresholdMins: z.number().int().positive(),
            warningPct: z.number().int().min(1).max(100).default(90),
            isActive: z.boolean().default(true),
          }),
        ),
      }),
    )
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
      return ctx.db.$transaction(async (tx) => {
        const contract = await tx.merchantContract.upsert({
          where: { merchantId: input.merchantId },
          update: {
            paymentPeriod: input.paymentPeriod,
            currency: input.currency,
            startDate: input.startDate,
            isActive: input.isActive,
          },
          create: {
            accountId,
            merchantId: input.merchantId,
            paymentPeriod: input.paymentPeriod,
            currency: input.currency,
            startDate: input.startDate,
            isActive: input.isActive,
          },
        });

        await tx.feeRule.deleteMany({
          where: { accountId, contractId: contract.id },
        });
        await tx.sLARule.deleteMany({
          where: { accountId, contractId: contract.id },
        });

        if (input.feeRules.length) {
          await tx.feeRule.createMany({
            data: input.feeRules.map((rule) => ({
              accountId,
              contractId: contract.id,
              feeType: rule.feeType,
              rateCents: rule.rateCents,
              unitLabel: rule.unitLabel,
              includedUnits: rule.includedUnits,
            })),
          });
        }

        if (input.slaRules.length) {
          await tx.sLARule.createMany({
            data: input.slaRules.map((rule) => ({
              accountId,
              contractId: contract.id,
              metric: rule.metric,
              thresholdMins: rule.thresholdMins,
              warningPct: rule.warningPct,
              isActive: rule.isActive,
            })),
          });
        }

        return tx.merchantContract.findUnique({
          where: { id: contract.id },
          include: { feeRules: true, slaRules: true },
        });
      });
    }),
});

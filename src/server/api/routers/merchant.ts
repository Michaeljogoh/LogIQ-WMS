import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { auth } from "@/lib/auth";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { assertWithinMerchantLimit } from "@/server/billing/plan-limits";

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

      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const callbackURL = `${base}/portal/dashboard?merchantUserId=${merchantUser.id}`;

      await auth.api.signInMagicLink({
        body: {
          email: input.email,
          callbackURL,
          name: input.name,
        },
        headers: ctx.req.headers,
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
      const [orderCount, lowStockCount, recentShipments, latestInvoice] =
        await ctx.db.$transaction([
          ctx.db.order.count({
            where: {
              accountId,
              merchantId,
              fulfillmentStatus: { not: "FULFILLED" },
            },
          }),
          ctx.db.product.count({
            where: {
              accountId,
              merchantId,
              lowStockThreshold: { not: null },
              stockLevels: {
                some: {
                  quantity: { lt: 10 },
                },
              },
            },
          }),
          ctx.db.shipment.findMany({
            where: { accountId, order: { merchantId } },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          ctx.db.invoice.findFirst({
            where: { accountId, merchantId },
            orderBy: { createdAt: "desc" },
          }),
        ]);
      return {
        openOrders: orderCount,
        lowStockCount,
        recentShipments,
        latestInvoice,
      };
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

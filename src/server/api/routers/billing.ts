import { TRPCError } from "@trpc/server";
import { startOfMonth } from "date-fns";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { limitsForPlan } from "@/server/billing/plan-limits";
import {
  getPolar,
  getPolarAccessToken,
  polarProductIdForPlan,
} from "@/server/billing/polar-config";

const ownerRoles = requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN");

export const billingRouter = createTRPCRouter({
  getSubscription: protectedProc.use(ownerRoles).query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    const account = await ctx.db.logiqAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: {
        id: true,
        plan: true,
        polarCustomerId: true,
        name: true,
      },
    });

    const token = getPolarAccessToken();
    if (!token || !account.polarCustomerId) {
      return {
        polarConfigured: Boolean(token),
        account,
        subscription: null as null,
      };
    }

    try {
      const polar = getPolar();
      const iter = await polar.subscriptions.list({
        customerId: account.polarCustomerId,
        active: true,
        limit: 5,
      });
      let first = null;
      for await (const page of iter) {
        first = page.result.items[0] ?? null;
        if (first) {
          break;
        }
      }
      return {
        polarConfigured: true,
        account,
        subscription: first
          ? {
              id: first.id,
              status: first.status,
              productId: first.productId,
              currentPeriodEnd: first.currentPeriodEnd,
              cancelAtPeriodEnd: first.cancelAtPeriodEnd,
            }
          : null,
      };
    } catch {
      return {
        polarConfigured: true,
        account,
        subscription: null as null,
      };
    }
  }),

  getUsage: protectedProc.use(ownerRoles).query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    const account = await ctx.db.logiqAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: { plan: true },
    });
    const limits = limitsForPlan(account.plan);
    const monthStart = startOfMonth(new Date());

    const [ordersThisMonth, labelsThisMonth] = await Promise.all([
      ctx.db.order.count({
        where: {
          accountId,
          createdAt: { gte: monthStart },
          status: { not: "CANCELLED" },
        },
      }),
      ctx.db.shipment.count({
        where: {
          accountId,
          createdAt: { gte: monthStart },
          status: { not: "VOIDED" },
        },
      }),
    ]);

    return {
      plan: account.plan,
      enterpriseProductConfigured: Boolean(polarProductIdForPlan("ENTERPRISE")),
      limits: {
        ordersPerMonth:
          limits.ordersPerMonth === Number.POSITIVE_INFINITY
            ? null
            : limits.ordersPerMonth,
        warehouses:
          limits.warehouses === Number.POSITIVE_INFINITY
            ? null
            : limits.warehouses,
        merchants:
          limits.merchants === Number.POSITIVE_INFINITY
            ? null
            : limits.merchants,
      },
      usage: {
        ordersThisMonth,
        labelsThisMonth,
      },
    };
  }),

  createCheckout: protectedProc
    .use(ownerRoles)
    .input(
      z.object({
        targetPlan: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      if (!getPolarAccessToken()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Billing is not configured (missing POLAR_ACCESS_TOKEN).",
        });
      }
      const productId = polarProductIdForPlan(input.targetPlan);
      if (!productId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "No Polar product ID configured for this plan. Set POLAR_PRODUCT_*_ID env vars.",
        });
      }

      const account = await ctx.db.logiqAccount.findUniqueOrThrow({
        where: { id: accountId },
        select: { id: true, name: true },
      });
      const owner = await ctx.db.accountUser.findFirst({
        where: { accountId, systemRole: "THREEPL_ACCOUNT_OWNER" },
        select: { email: true },
      });

      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const polar = getPolar();
      const checkout = await polar.checkouts.create({
        products: [productId],
        successUrl: `${base}/settings/billing?checkout=success`,
        returnUrl: `${base}/settings/billing`,
        externalCustomerId: accountId,
        metadata: { accountId },
        customerMetadata: { accountId },
        customerEmail: owner?.email,
        customerName: account.name,
      });

      return { checkoutUrl: checkout.url };
    }),

  getPortalUrl: protectedProc.use(ownerRoles).mutation(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    if (!getPolarAccessToken()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Billing is not configured (missing POLAR_ACCESS_TOKEN).",
      });
    }
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const polar = getPolar();
    const session = await polar.customerSessions.create({
      externalCustomerId: accountId,
      returnUrl: `${base}/settings/billing`,
    });
    return { portalUrl: session.customerPortalUrl };
  }),

  getInvoices: protectedProc.use(ownerRoles).query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    const account = await ctx.db.logiqAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: { polarCustomerId: true },
    });
    if (!getPolarAccessToken() || !account.polarCustomerId) {
      return {
        items: [] as Array<{
          id: string;
          createdAt: Date;
          totalAmount: number;
          currency: string;
          paid: boolean;
          invoicePdfUrl: string | null;
        }>,
      };
    }

    const polar = getPolar();
    const iter = await polar.orders.list({
      customerId: account.polarCustomerId,
      limit: 20,
      sorting: ["-created_at"] as const,
    });

    const items: Array<{
      id: string;
      createdAt: Date;
      totalAmount: number;
      currency: string;
      paid: boolean;
      invoicePdfUrl: string | null;
    }> = [];

    for await (const page of iter) {
      for (const order of page.result.items) {
        let invoicePdfUrl: string | null = null;
        if (order.isInvoiceGenerated) {
          try {
            const inv = await polar.orders.invoice({ id: order.id });
            invoicePdfUrl = inv.url;
          } catch {
            invoicePdfUrl = null;
          }
        }
        items.push({
          id: order.id,
          createdAt: order.createdAt,
          totalAmount: order.totalAmount,
          currency: order.currency,
          paid: order.paid,
          invoicePdfUrl,
        });
      }
      break;
    }

    return { items };
  }),
});

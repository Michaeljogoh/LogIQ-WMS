import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

const integrationTypeEnum = z.enum([
  "SHOPIFY",
  "WOOCOMMERCE",
  "BIGCOMMERCE",
  "ETSY",
  "TIKTOK_SHOP",
  "EBAY",
]);

export const integrationRouter = createTRPCRouter({
  list: protectedProc
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
          message: "Merchant context is required.",
        });
      }
      return ctx.db.integration.findMany({
        where: { accountId, merchantId: ctx.merchantId },
        orderBy: { type: "asc" },
      });
    }),

  getOAuthUrl: protectedProc
    .use(
      requireRole(
        "MERCHANT_OWNER",
        "THREEPL_ACCOUNT_OWNER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        type: integrationTypeEnum,
      }),
    )
    .query(({ input }) => {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const callback = `${base}/portal/settings/integrations/${input.type.toLowerCase()}/connect`;
      const authUrl = `${base}/api/integrations/${input.type.toLowerCase()}/oauth?redirect_uri=${encodeURIComponent(
        callback,
      )}`;
      return { authUrl };
    }),

  handleCallback: protectedProc
    .use(
      requireRole(
        "MERCHANT_OWNER",
        "THREEPL_ACCOUNT_OWNER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        type: integrationTypeEnum,
        code: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      if (!ctx.merchantId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Merchant context is required.",
        });
      }
      return ctx.db.integration.upsert({
        where: {
          accountId_merchantId_type: {
            accountId,
            merchantId: ctx.merchantId,
            type: input.type,
          },
        },
        update: {
          status: "CONNECTED",
          credentials: {
            code: input.code,
            connectedAt: new Date().toISOString(),
          },
          metadata: {
            orderCount: 0,
          },
          lastSyncAt: new Date(),
        },
        create: {
          accountId,
          merchantId: ctx.merchantId,
          type: input.type,
          status: "CONNECTED",
          credentials: {
            code: input.code,
            connectedAt: new Date().toISOString(),
          },
          metadata: {
            orderCount: 0,
          },
          lastSyncAt: new Date(),
        },
      });
    }),

  disconnect: protectedProc
    .use(
      requireRole(
        "MERCHANT_OWNER",
        "THREEPL_ACCOUNT_OWNER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ integrationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const existing = await ctx.db.integration.findFirst({
        where: { id: input.integrationId, accountId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Integration not found." });
      }
      return ctx.db.integration.update({
        where: { id: existing.id },
        data: {
          status: "DISCONNECTED",
          credentials: {},
        },
      });
    }),

  syncNow: protectedProc
    .use(
      requireRole(
        "MERCHANT_OWNER",
        "THREEPL_ACCOUNT_OWNER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ integrationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const integration = await ctx.db.integration.findFirst({
        where: { id: input.integrationId, accountId },
      });
      if (!integration) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Integration not found." });
      }
      const previousOrderCount =
        integration.metadata &&
        typeof integration.metadata === "object" &&
        "orderCount" in integration.metadata
          ? Number((integration.metadata as { orderCount?: number }).orderCount ?? 0)
          : 0;

      return ctx.db.integration.update({
        where: { id: integration.id },
        data: {
          status: "CONNECTED",
          lastSyncAt: new Date(),
          metadata: {
            orderCount: previousOrderCount + 5,
            lastSyncResult: "ok",
          },
        },
      });
    }),
});

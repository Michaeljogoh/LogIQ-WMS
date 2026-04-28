import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { encryptJson } from "@/lib/secure-json";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import {
  exchangeIntegrationCode,
  getIntegrationOAuthUrl,
  syncIntegrationOrders,
} from "@/server/integrations/hub";

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
        select: {
          id: true,
          type: true,
          status: true,
          metadata: true,
          lastSyncAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),

  getOAuthUrl: protectedProc
    .use(
      requireRole("MERCHANT_OWNER", "THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"),
    )
    .input(
      z.object({
        type: integrationTypeEnum,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      if (!ctx.merchantId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Merchant context is required.",
        });
      }
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const callback = `${base}/portal/settings/integrations/${input.type.toLowerCase().replace("_", "-")}/connect`;
      const state = Buffer.from(
        JSON.stringify({
          accountId,
          merchantId: ctx.merchantId,
          type: input.type,
        }),
      ).toString("base64url");
      const authUrl = getIntegrationOAuthUrl({
        type: input.type,
        redirectUri: callback,
        state,
      });
      return { authUrl };
    }),

  handleCallback: protectedProc
    .use(
      requireRole("MERCHANT_OWNER", "THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"),
    )
    .input(
      z.object({
        type: integrationTypeEnum,
        code: z.string().min(1),
        manualCredentials: z.record(z.string(), z.string()).optional(),
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
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const callback = `${base}/portal/settings/integrations/${input.type.toLowerCase().replace("_", "-")}/connect`;
      const exchanged =
        input.type === "WOOCOMMERCE" && input.manualCredentials
          ? input.manualCredentials
          : await exchangeIntegrationCode({
              type: input.type,
              code: input.code,
              redirectUri: callback,
            });
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
          credentials: encryptJson({
            ...exchanged,
            connectedAt: new Date().toISOString(),
          }),
          metadata: {
            orderCount: 0,
            hasWebhook: input.type !== "ETSY" && input.type !== "EBAY",
          },
          lastSyncAt: new Date(),
        },
        create: {
          accountId,
          merchantId: ctx.merchantId,
          type: input.type,
          status: "CONNECTED",
          credentials: encryptJson({
            ...exchanged,
            connectedAt: new Date().toISOString(),
          }),
          metadata: {
            orderCount: 0,
            hasWebhook: input.type !== "ETSY" && input.type !== "EBAY",
          },
          lastSyncAt: new Date(),
        },
      });
    }),

  disconnect: protectedProc
    .use(
      requireRole("MERCHANT_OWNER", "THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"),
    )
    .input(z.object({ integrationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const existing = await ctx.db.integration.findFirst({
        where: { id: input.integrationId, accountId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found.",
        });
      }
      await ctx.db.integrationSyncLog.create({
        data: {
          accountId,
          integrationId: existing.id,
          eventType: "disconnect",
          status: "SUCCESS",
        },
      });
      return ctx.db.integration.delete({ where: { id: existing.id } });
    }),

  syncNow: protectedProc
    .use(
      requireRole("MERCHANT_OWNER", "THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"),
    )
    .input(z.object({ integrationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const integration = await ctx.db.integration.findFirst({
        where: { id: input.integrationId, accountId },
      });
      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found.",
        });
      }
      return syncIntegrationOrders({
        integration,
        trigger: "manual",
      });
    }),

  getSyncLog: protectedProc
    .use(
      requireRole("MERCHANT_OWNER", "THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"),
    )
    .input(z.object({ integrationId: z.string().cuid().optional() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const logs = await ctx.db.integrationSyncLog.findMany({
        where: {
          accountId,
          ...(input.integrationId
            ? { integrationId: input.integrationId }
            : {}),
        },
        include: {
          integration: {
            select: {
              id: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return logs;
    }),

  createApiKey: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .input(
      z.object({
        name: z.string().min(1).max(80),
        scopes: z.array(z.string().min(1)).min(1),
        expiresAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const rawKey = `lq_${crypto.randomBytes(24).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.slice(0, 8);
      const created = await ctx.db.apiKey.create({
        data: {
          accountId,
          name: input.name,
          keyHash,
          keyPrefix,
          scopes: input.scopes,
          expiresAt: input.expiresAt,
          isActive: true,
        },
      });
      return {
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        scopes: created.scopes,
        expiresAt: created.expiresAt,
        rawKey,
      };
    }),

  listApiKeys: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.apiKey.findMany({
        where: { accountId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          lastUsedAt: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
        },
      });
    }),

  revokeApiKey: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .input(z.object({ apiKeyId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const key = await ctx.db.apiKey.findFirst({
        where: { id: input.apiKeyId, accountId },
        select: { id: true },
      });
      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found.",
        });
      }
      return ctx.db.apiKey.update({
        where: { id: key.id },
        data: { isActive: false },
      });
    }),
});

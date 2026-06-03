import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt } from "../helpers";
import type { SeedContext } from "../types";

export async function seedIntegrations(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const integrations = await db.integration.createManyAndReturn({
    data: [
      {
        accountId: ctx.accountId,
        merchantId: ctx.apexId,
        type: "SHOPIFY",
        status: "CONNECTED",
        credentials: {
          shopDomain: "apex-sportswear.myshopify.com",
          apiVersion: "2024-01",
        },
        metadata: { planName: "Shopify Plus", ordersPerMonth: 450 },
        lastSyncAt: daysAgo(0),
      },
      {
        accountId: ctx.accountId,
        merchantId: ctx.novatechId,
        type: "WOOCOMMERCE",
        status: "CONNECTED",
        credentials: {
          siteUrl: "https://novatech-store.demo",
          apiVersion: "3.0",
        },
        metadata: { ordersPerMonth: 180 },
        lastSyncAt: daysAgo(1),
      },
      {
        accountId: ctx.accountId,
        merchantId: ctx.lumiereId,
        type: "TIKTOK_SHOP",
        status: "ERROR",
        credentials: { appKey: "demo_app_key_lumiere" },
        metadata: { errorMessage: "Access token expired — reconnect required" },
        lastSyncAt: daysAgo(5),
      },
      {
        accountId: ctx.accountId,
        merchantId: null,
        type: "EASYPOST",
        status: "CONNECTED",
        credentials: { apiKey: "DEMO_EASYPOST_KEY" },
        metadata: { testMode: true },
        lastSyncAt: daysAgo(0),
      },
    ],
  });

  // Sync logs for the Shopify integration
  const shopifyIntegration = integrations[0];
  if (shopifyIntegration) {
    await db.integrationSyncLog.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        accountId: ctx.accountId,
        integrationId: shopifyIntegration.id,
        eventType: "order_sync",
        status: i === 6 ? "ERROR" : "SUCCESS",
        ordersFetched: randInt(5, 25),
        ordersUpserted: randInt(3, 20),
        errorMessage: i === 6 ? "Rate limit exceeded — retrying in 60s" : null,
        createdAt: daysAgo(i),
      })),
    });
  }

  // API key
  await db.apiKey.create({
    data: {
      accountId: ctx.accountId,
      name: "Demo Integration Key",
      keyHash: "demo_hash_abc123_not_real",
      keyPrefix: "liq_demo",
      scopes: ["orders:read", "inventory:read", "webhooks:write"],
      isActive: true,
      lastUsedAt: daysAgo(1),
    },
  });

  // Webhook endpoint
  await db.webhookEndpoint.create({
    data: {
      accountId: ctx.accountId,
      url: "https://demo.example.com/webhooks/logiq",
      secret: "whsec_demo_secret_not_real",
      isActive: true,
    },
  });

  return { ...ctx, integrationIds: integrations.map((i) => i.id) };
}

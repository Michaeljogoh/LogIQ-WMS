import type {
  Integration,
  IntegrationType,
  Prisma,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/secure-json";
import {
  normaliseOrder,
  type NormalisedOrder,
} from "@/server/integrations/normaliser";
import { dispatchOutboundWebhook } from "@/server/integrations/svix-events";
import { bigcommerceConnector } from "./bigcommerce";
import { ebayConnector } from "./ebay";
import { etsyConnector } from "./etsy";
import { shopifyConnector } from "./shopify";
import { tiktokShopConnector } from "./tiktok-shop";
import { woocommerceConnector } from "./woocommerce";

type Connector = {
  getOAuthUrl: (redirectUri: string, state: string) => string;
  exchangeCodeForToken: (
    code: string,
    redirectUri: string,
  ) => Promise<Record<string, unknown>>;
  fetchOrders: (credentials: Record<string, unknown>) => Promise<
    Array<{
      id: string;
      lines: Array<{ sku: string; quantity: number }>;
      shippingAddress: {
        name: string;
        street1: string;
        city: string;
        state: string;
        zip: string;
        country: string;
      };
      updatedAtIso: string;
    }>
  >;
  pushTracking: (args: {
    credentials: Record<string, unknown>;
    channelOrderId: string;
    trackingNumber: string;
    carrier: string;
    service?: string | null;
  }) => Promise<void>;
};

function getConnector(type: IntegrationType): Connector {
  switch (type) {
    case "SHOPIFY":
      return shopifyConnector;
    case "WOOCOMMERCE":
      return woocommerceConnector;
    case "BIGCOMMERCE":
      return bigcommerceConnector;
    case "ETSY":
      return etsyConnector;
    case "TIKTOK_SHOP":
      return tiktokShopConnector;
    case "EBAY":
      return ebayConnector;
    default:
      throw new Error(`Connector not supported for integration type ${type}`);
  }
}

export function getIntegrationOAuthUrl(args: {
  type: IntegrationType;
  redirectUri: string;
  state: string;
}) {
  return getConnector(args.type).getOAuthUrl(args.redirectUri, args.state);
}

export async function exchangeIntegrationCode(args: {
  type: IntegrationType;
  code: string;
  redirectUri: string;
}) {
  return getConnector(args.type).exchangeCodeForToken(
    args.code,
    args.redirectUri,
  );
}

export async function syncIntegrationOrders(args: {
  integration: Integration & { merchantId: string | null };
  trigger: "manual" | "poll" | "webhook";
}) {
  if (!args.integration.merchantId) {
    throw new Error("Merchant-scoped integration is required for order sync.");
  }
  const connector = getConnector(args.integration.type);
  const credentials = decryptJson(args.integration.credentials);
  const externalOrders = await connector.fetchOrders(credentials);
  const normalisedOrders = externalOrders.map((order) =>
    normaliseOrder({
      platform: args.integration.type as NormalisedOrder["channel"],
      payload: {
        id: order.id,
        shippingAddress: order.shippingAddress,
        lines: order.lines,
      },
      accountId: args.integration.accountId,
      merchantId: args.integration.merchantId!,
    }),
  );

  const upsertedCount = await upsertNormalisedOrders(normalisedOrders);
  await db.integration.update({
    where: { id: args.integration.id },
    data: {
      lastSyncAt: new Date(),
      status: "CONNECTED",
      metadata: toJsonObject({
        ...asRecord(args.integration.metadata),
        orderCount: upsertedCount,
        lastTrigger: args.trigger,
        lastSyncAt: new Date().toISOString(),
      }),
    },
  });
  await db.integrationSyncLog.create({
    data: {
      accountId: args.integration.accountId,
      integrationId: args.integration.id,
      eventType: args.trigger,
      status: "SUCCESS",
      ordersFetched: externalOrders.length,
      ordersUpserted: upsertedCount,
    },
  });

  return {
    ordersFetched: externalOrders.length,
    ordersUpserted: upsertedCount,
  };
}

async function upsertNormalisedOrders(orders: NormalisedOrder[]) {
  let count = 0;
  const createdEvents: Array<{
    accountId: string;
    orderId: string;
    channelOrderId: string;
    merchantId: string;
    channel: string;
  }> = [];
  for (const order of orders) {
    await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          accountId: order.accountId,
          merchantId: order.merchantId,
          sku: { in: order.lines.map((line) => line.sku) },
        },
        select: { id: true, sku: true },
      });
      if (products.length !== order.lines.length) {
        return;
      }
      const productBySku = new Map(
        products.map((product) => [product.sku, product.id]),
      );

      const existing = await tx.order.findFirst({
        where: {
          accountId: order.accountId,
          channelOrderId: order.channelOrderId,
          channel: order.channel,
        },
        select: { id: true },
      });
      const wasCreated = !existing;
      const orderRecord = existing
        ? await tx.order.update({
            where: { id: existing.id },
            data: {
              shippingName: order.shippingName,
              shippingLine1: order.shippingLine1,
              shippingCity: order.shippingCity,
              shippingState: order.shippingState,
              shippingZip: order.shippingZip,
              shippingCountry: order.shippingCountry,
              slaHours: order.slaHours ?? null,
              dueAt:
                typeof order.slaHours === "number"
                  ? new Date(Date.now() + order.slaHours * 60 * 60 * 1000)
                  : null,
            },
          })
        : await tx.order.create({
            data: {
              accountId: order.accountId,
              merchantId: order.merchantId,
              channelOrderId: order.channelOrderId,
              channel: order.channel,
              shippingName: order.shippingName,
              shippingLine1: order.shippingLine1,
              shippingCity: order.shippingCity,
              shippingState: order.shippingState,
              shippingZip: order.shippingZip,
              shippingCountry: order.shippingCountry,
              slaHours: order.slaHours ?? null,
              dueAt:
                typeof order.slaHours === "number"
                  ? new Date(Date.now() + order.slaHours * 60 * 60 * 1000)
                  : null,
            },
          });

      await tx.orderLine.deleteMany({ where: { orderId: orderRecord.id } });
      await tx.orderLine.createMany({
        data: order.lines
          .map((line) => {
            const productId = productBySku.get(line.sku);
            if (!productId) {
              return null;
            }
            return {
              orderId: orderRecord.id,
              productId,
              sku: line.sku,
              quantity: line.quantity,
            };
          })
          .filter((line): line is NonNullable<typeof line> => Boolean(line)),
      });
      count += 1;
      if (wasCreated) {
        createdEvents.push({
          accountId: order.accountId,
          orderId: orderRecord.id,
          channelOrderId: order.channelOrderId,
          merchantId: order.merchantId,
          channel: order.channel,
        });
      }
    });
  }
  await Promise.allSettled(
    createdEvents.map((event) =>
      dispatchOutboundWebhook({
        accountId: event.accountId,
        eventType: "logiqwms.order.created",
        payload: {
          orderId: event.orderId,
          channelOrderId: event.channelOrderId,
          merchantId: event.merchantId,
          channel: event.channel,
        },
      }),
    ),
  );
  return count;
}

export async function pushTrackingToIntegration(args: {
  integration: Integration & { merchantId: string | null };
  channelOrderId: string;
  trackingNumber: string;
  carrier: string;
  service?: string | null;
}) {
  const connector = getConnector(args.integration.type);
  await connector.pushTracking({
    credentials: decryptJson(args.integration.credentials),
    channelOrderId: args.channelOrderId,
    trackingNumber: args.trackingNumber,
    carrier: args.carrier,
    service: args.service,
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

import crypto from "node:crypto";
import { db } from "@/lib/db";

export type OutboundWebhookEventType =
  | "logiqwms.order.created"
  | "logiqwms.order.status_changed"
  | "logiqwms.shipment.label_created"
  | "logiqwms.shipment.delivered"
  | "logiqwms.shipment.exception"
  | "logiqwms.inventory.low_stock"
  | "logiqwms.invoice.sent";

async function sendSignedWebhook(args: {
  url: string;
  secret: string;
  eventType: OutboundWebhookEventType;
  payload: Record<string, unknown>;
}) {
  const body = JSON.stringify({
    type: args.eventType,
    payload: args.payload,
    sentAt: new Date().toISOString(),
  });
  const signature = crypto
    .createHmac("sha256", args.secret)
    .update(body)
    .digest("hex");
  await fetch(args.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-logiq-signature": signature,
      "x-logiq-event": args.eventType,
    },
    body,
  });
}

export async function dispatchOutboundWebhook(args: {
  accountId: string;
  eventType: OutboundWebhookEventType;
  payload: Record<string, unknown>;
}) {
  const endpoints = await db.webhookEndpoint.findMany({
    where: { accountId: args.accountId, isActive: true },
    select: { url: true, secret: true },
  });
  await Promise.allSettled(
    endpoints.map((endpoint) =>
      sendSignedWebhook({
        url: endpoint.url,
        secret: endpoint.secret,
        eventType: args.eventType,
        payload: args.payload,
      }),
    ),
  );
}

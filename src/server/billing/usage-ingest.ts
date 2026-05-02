import { db } from "@/lib/db";
import { getPolar, getPolarAccessToken } from "@/server/billing/polar-config";

function safeIngest(fn: () => Promise<void>, context: string): void {
  void fn().catch((err: unknown) => {
    console.error(`[billing] ${context}`, err);
  });
}

export function scheduleOverageOrderMeter(
  accountId: string,
  orderId: string,
): void {
  safeIngest(async () => {
    if (!getPolarAccessToken()) {
      return;
    }
    const account = await db.logiqAccount.findUnique({
      where: { id: accountId },
      select: { polarCustomerId: true },
    });
    const customerId = account?.polarCustomerId;
    if (!customerId) {
      return;
    }
    const polar = getPolar();
    await polar.events.ingest({
      events: [
        {
          name: "overage_order",
          customerId,
          externalId: `overage:${accountId}:${orderId}`,
          metadata: { accountId, orderId },
        },
      ],
    });
  }, "overage_order ingest");
}

export function scheduleOrderFulfilledAndLabelPurchased(params: {
  accountId: string;
  orderId: string;
  shipmentId: string;
}): void {
  safeIngest(async () => {
    if (!getPolarAccessToken()) {
      return;
    }
    const account = await db.logiqAccount.findUnique({
      where: { id: params.accountId },
      select: { polarCustomerId: true },
    });
    const customerId = account?.polarCustomerId;
    if (!customerId) {
      return;
    }
    const polar = getPolar();
    await polar.events.ingest({
      events: [
        {
          name: "order_fulfilled",
          customerId,
          externalId: `order_fulfilled:${params.orderId}:${params.shipmentId}`,
          metadata: {
            accountId: params.accountId,
            orderId: params.orderId,
          },
        },
        {
          name: "label_purchased",
          customerId,
          externalId: `label_purchased:${params.shipmentId}`,
          metadata: {
            accountId: params.accountId,
            shipmentId: params.shipmentId,
          },
        },
      ],
    });
  }, "fulfillment/label ingest");
}

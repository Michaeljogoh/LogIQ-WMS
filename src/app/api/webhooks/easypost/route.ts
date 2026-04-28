import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispatchOutboundWebhook } from "@/server/integrations/svix-events";

type EasyPostEvent = {
  description?: string;
  result?: {
    tracking_code?: string;
    status?: string;
    tracking_details?: Array<{
      datetime?: string;
      message?: string;
      status?: string;
    }>;
  };
};

const STATUS_MAP: Record<
  string,
  "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "EXCEPTION"
> = {
  in_transit: "IN_TRANSIT",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  failure: "EXCEPTION",
  return_to_sender: "EXCEPTION",
  available_for_pickup: "OUT_FOR_DELIVERY",
};

export async function POST(request: Request) {
  const payload = (await request.json()) as EasyPostEvent;
  const trackingNumber = payload.result?.tracking_code;
  if (!trackingNumber) {
    return NextResponse.json({ ok: true });
  }
  const shipment = await db.shipment.findFirst({
    where: { trackingNumber },
    include: { order: true },
  });
  if (!shipment) {
    return NextResponse.json({ ok: true });
  }
  const statusRaw = payload.result?.status?.toLowerCase() ?? "";
  const status = STATUS_MAP[statusRaw] ?? "IN_TRANSIT";
  const eventAt = new Date(
    payload.result?.tracking_details?.[0]?.datetime ?? new Date().toISOString(),
  );

  await db.$transaction(async (tx) => {
    await tx.trackingEvent.create({
      data: {
        accountId: shipment.accountId,
        shipmentId: shipment.id,
        status,
        description:
          payload.result?.tracking_details?.[0]?.message ??
          payload.description ??
          "Carrier update",
        eventAt,
      },
    });
    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status,
        shippedAt:
          status === "IN_TRANSIT"
            ? (shipment.shippedAt ?? eventAt)
            : shipment.shippedAt,
        deliveredAt: status === "DELIVERED" ? eventAt : shipment.deliveredAt,
      },
    });
  });

  if (status === "DELIVERED") {
    await dispatchOutboundWebhook({
      accountId: shipment.accountId,
      eventType: "logiqwms.shipment.delivered",
      payload: {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        trackingNumber: shipment.trackingNumber,
      },
    });
  } else if (status === "EXCEPTION") {
    await dispatchOutboundWebhook({
      accountId: shipment.accountId,
      eventType: "logiqwms.shipment.exception",
      payload: {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        trackingNumber: shipment.trackingNumber,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

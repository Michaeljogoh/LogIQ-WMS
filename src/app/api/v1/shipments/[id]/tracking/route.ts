import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApiRequest,
  withApiErrorHandling,
} from "@/app/api/v1/_lib";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const auth = await authenticateApiRequest("shipments:read");
    if (!auth.ok) {
      return auth.response;
    }
    const { id } = await context.params;
    const shipment = await db.shipment.findFirst({
      where: { id, accountId: auth.accountId },
      include: {
        trackingEvents: {
          orderBy: { eventAt: "asc" },
        },
      },
    });
    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      shipmentId: shipment.id,
      carrier: shipment.carrier,
      service: shipment.service,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      events: shipment.trackingEvents,
    });
  });
}

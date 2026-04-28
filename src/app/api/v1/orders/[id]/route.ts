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
    const auth = await authenticateApiRequest("orders:read");
    if (!auth.ok) {
      return auth.response;
    }
    const { id } = await context.params;
    const order = await db.order.findFirst({
      where: { id, accountId: auth.accountId },
      include: {
        lines: true,
        shipments: { include: { trackingEvents: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  });
}

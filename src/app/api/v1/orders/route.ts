import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { shouldMeterOrderOverage } from "@/server/billing/plan-limits";
import { scheduleOverageOrderMeter } from "@/server/billing/usage-ingest";
import {
  authenticateApiRequest,
  withApiErrorHandling,
} from "@/app/api/v1/_lib";

const createOrderSchema = z.object({
  merchantId: z.string().cuid(),
  channelOrderId: z.string().min(1),
  channel: z.string().min(1),
  shippingName: z.string().min(1),
  shippingLine1: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingState: z.string().min(1),
  shippingZip: z.string().min(1),
  shippingCountry: z.string().min(1).default("US"),
  lines: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function GET() {
  return withApiErrorHandling(async () => {
    const auth = await authenticateApiRequest("orders:read");
    if (!auth.ok) {
      return auth.response;
    }
    const orders = await db.order.findMany({
      where: { accountId: auth.accountId },
      include: { lines: true, shipments: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ items: orders });
  });
}

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    const auth = await authenticateApiRequest("orders:write");
    if (!auth.ok) {
      return auth.response;
    }
    const body = createOrderSchema.parse(await request.json());
    const products = await db.product.findMany({
      where: {
        accountId: auth.accountId,
        merchantId: body.merchantId,
        sku: { in: body.lines.map((line) => line.sku) },
      },
      select: { id: true, sku: true },
    });
    const productBySku = new Map(
      products.map((product) => [product.sku, product.id]),
    );
    if (productBySku.size !== body.lines.length) {
      return NextResponse.json(
        { error: "One or more SKUs were not found for this merchant." },
        { status: 400 },
      );
    }

    const created = await db.$transaction(async (tx) => {
      const markOverage = await shouldMeterOrderOverage(tx, auth.accountId);
      const order = await tx.order.create({
        data: {
          accountId: auth.accountId,
          merchantId: body.merchantId,
          channelOrderId: body.channelOrderId,
          channel: body.channel,
          shippingName: body.shippingName,
          shippingLine1: body.shippingLine1,
          shippingCity: body.shippingCity,
          shippingState: body.shippingState,
          shippingZip: body.shippingZip,
          shippingCountry: body.shippingCountry,
          lines: {
            create: body.lines
              .map((line) => {
                const productId = productBySku.get(line.sku);
                if (!productId) {
                  return null;
                }
                return {
                  productId,
                  sku: line.sku,
                  quantity: line.quantity,
                };
              })
              .filter((line): line is NonNullable<typeof line> =>
                Boolean(line),
              ),
          },
        },
        include: { lines: true },
      });
      return { order, markOverage };
    });
    if (created.markOverage) {
      scheduleOverageOrderMeter(auth.accountId, created.order.id);
    }
    return NextResponse.json(created.order, { status: 201 });
  });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApiRequest,
  withApiErrorHandling,
} from "@/app/api/v1/_lib";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sku: string }> },
) {
  return withApiErrorHandling(async () => {
    const auth = await authenticateApiRequest("inventory:read");
    if (!auth.ok) {
      return auth.response;
    }
    const { sku } = await context.params;
    const product = await db.product.findFirst({
      where: { accountId: auth.accountId, sku },
      include: {
        stockLevels: {
          select: {
            warehouseId: true,
            quantity: true,
            reservedQty: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "SKU not found" }, { status: 404 });
    }
    return NextResponse.json({
      sku: product.sku,
      totalQuantity: product.stockLevels.reduce(
        (sum, level) => sum + level.quantity,
        0,
      ),
      totalReserved: product.stockLevels.reduce(
        (sum, level) => sum + level.reservedQty,
        0,
      ),
      levels: product.stockLevels,
    });
  });
}

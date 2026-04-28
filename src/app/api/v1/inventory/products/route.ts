import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApiRequest,
  withApiErrorHandling,
} from "@/app/api/v1/_lib";

export async function GET() {
  return withApiErrorHandling(async () => {
    const auth = await authenticateApiRequest("inventory:read");
    if (!auth.ok) {
      return auth.response;
    }
    const products = await db.product.findMany({
      where: { accountId: auth.accountId },
      include: { stockLevels: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      items: products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        merchantId: product.merchantId,
        stock: product.stockLevels.reduce(
          (sum, level) => sum + level.quantity,
          0,
        ),
      })),
    });
  });
}

import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt } from "../helpers";
import type { SeedContext } from "../types";

/**
 * Assigns each product to 2 bins in LAX and 1 bin in ORD.
 * Uses deterministic index-based assignment to guarantee uniqueness
 * of the (productId, binId) pair required by the StockLevel unique constraint.
 */
export async function seedStock(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const allProducts = [
    ...ctx.apexProductIds,
    ...ctx.novatechProductIds,
    ...ctx.lumiereProductIds,
  ];

  const totalProducts = allProducts.length; // 24

  for (let i = 0; i < totalProducts; i++) {
    const productId = allProducts[i] as string;

    // Two bins per product in LAX (offset by half the pool size to stay distinct)
    const laxBinA = ctx.laxBins[i % ctx.laxBins.length] as string;
    const laxBinB = ctx.laxBins[
      (i + Math.floor(ctx.laxBins.length / 2)) % ctx.laxBins.length
    ] as string;
    const ordBin = ctx.ordBins[i % ctx.ordBins.length] as string;

    const qtyLaxA = randInt(50, 250);
    const qtyLaxB = randInt(20, 100);
    const qtyOrd = randInt(30, 150);

    await db.stockLevel.createMany({
      data: [
        {
          accountId: ctx.accountId,
          productId,
          binId: laxBinA,
          warehouseId: ctx.laxId,
          quantity: qtyLaxA,
          reservedQty: randInt(0, Math.floor(qtyLaxA * 0.15)),
        },
        {
          accountId: ctx.accountId,
          productId,
          binId: laxBinB,
          warehouseId: ctx.laxId,
          quantity: qtyLaxB,
          reservedQty: 0,
        },
        {
          accountId: ctx.accountId,
          productId,
          binId: ordBin,
          warehouseId: ctx.ordId,
          quantity: qtyOrd,
          reservedQty: randInt(0, Math.floor(qtyOrd * 0.1)),
        },
      ],
    });

    // Historical movements spread over 90 days
    for (let d = 90; d >= 1; d -= 3) {
      if (Math.random() > 0.4) {
        await db.stockMovement.create({
          data: {
            accountId: ctx.accountId,
            productId,
            warehouseId: ctx.laxId,
            binId: laxBinA,
            type: d % 6 === 0 ? "INBOUND" : "OUTBOUND",
            quantityDelta: d % 6 === 0 ? randInt(20, 80) : -randInt(1, 8),
            quantityBefore: qtyLaxA + randInt(10, 30),
            quantityAfter: qtyLaxA,
            referenceType: d % 6 === 0 ? "PURCHASE_ORDER" : "ORDER",
            performedBy: ctx.staff1AccountUserId,
            createdAt: daysAgo(d),
          },
        });
      }
    }
  }

  return ctx;
}

import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt } from "../helpers";
import type { SeedContext } from "../types";

export async function seedCycleCounts(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const allProducts = [
    ...ctx.apexProductIds,
    ...ctx.novatechProductIds,
    ...ctx.lumiereProductIds,
  ];

  // ACTIVE cycle count in LAX — 15 lines, not yet counted
  const activeCount = await db.cycleCount.create({
    data: {
      accountId: ctx.accountId,
      warehouseId: ctx.laxId,
      name: "LAX Monthly Count — June 2024",
      status: "ACTIVE",
      scheduledDate: daysAgo(-2),
      createdBy: ctx.managerAccountUserId,
      createdAt: daysAgo(3),
    },
  });

  for (let i = 0; i < 15; i++) {
    const productId = allProducts[i % allProducts.length] as string;
    const binId = ctx.laxBins[i % ctx.laxBins.length] as string;
    const expectedQty = randInt(30, 200);
    const counted = i < 8; // first 8 have been counted

    await db.cycleCountLine.create({
      data: {
        cycleCountId: activeCount.id,
        productId,
        binId,
        expectedQty,
        countedQty: counted ? expectedQty + randInt(-5, 5) : null,
        discrepancy: counted ? randInt(-5, 5) : null,
        reconciled: false,
      },
    });
  }

  // RECONCILED cycle count in ORD — all lines counted and reconciled
  const reconciledCount = await db.cycleCount.create({
    data: {
      accountId: ctx.accountId,
      warehouseId: ctx.ordId,
      name: "ORD Full Count — May 2024",
      status: "RECONCILED",
      scheduledDate: daysAgo(32),
      completedAt: daysAgo(28),
      createdBy: ctx.managerAccountUserId,
      createdAt: daysAgo(35),
    },
  });

  for (let i = 0; i < 12; i++) {
    const productId = allProducts[(i + 5) % allProducts.length] as string;
    const binId = ctx.ordBins[i % ctx.ordBins.length] as string;
    const expectedQty = randInt(20, 150);
    const discrepancy = i % 5 === 0 ? randInt(-10, 10) : 0;

    await db.cycleCountLine.create({
      data: {
        cycleCountId: reconciledCount.id,
        productId,
        binId,
        expectedQty,
        countedQty: expectedQty + discrepancy,
        discrepancy,
        reconciled: true,
      },
    });
  }

  return ctx;
}

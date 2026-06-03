import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt, seqRef } from "../helpers";
import type { SeedContext } from "../types";

export async function seedTransfers(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const transferSpecs = [
    {
      toNumber: seqRef("TO", 1),
      fromWarehouseId: ctx.laxId,
      toWarehouseId: ctx.ordId,
      status: "PENDING" as const,
      productIds: ctx.apexProductIds.slice(0, 3),
      daysAgo: 1,
    },
    {
      toNumber: seqRef("TO", 2),
      fromWarehouseId: ctx.laxId,
      toWarehouseId: ctx.ordId,
      status: "SHIPPED" as const,
      productIds: ctx.novatechProductIds.slice(0, 2),
      daysAgo: 5,
    },
    {
      toNumber: seqRef("TO", 3),
      fromWarehouseId: ctx.ordId,
      toWarehouseId: ctx.laxId,
      status: "RECEIVED" as const,
      productIds: ctx.lumiereProductIds.slice(0, 4),
      daysAgo: 15,
    },
  ];

  for (const spec of transferSpecs) {
    const transfer = await db.transferOrder.create({
      data: {
        accountId: ctx.accountId,
        fromWarehouseId: spec.fromWarehouseId,
        toWarehouseId: spec.toWarehouseId,
        toNumber: spec.toNumber,
        status: spec.status,
        requestedBy: ctx.ownerAccountUserId,
        completedAt:
          spec.status === "RECEIVED" ? daysAgo(spec.daysAgo - 5) : null,
        createdAt: daysAgo(spec.daysAgo),
      },
    });

    await db.transferOrderLine.createMany({
      data: spec.productIds.map((productId) => ({
        transferId: transfer.id,
        productId,
        requestedQty: randInt(20, 80),
        shippedQty: spec.status !== "PENDING" ? randInt(15, 75) : 0,
        receivedQty: spec.status === "RECEIVED" ? randInt(15, 70) : 0,
      })),
    });
  }

  return ctx;
}

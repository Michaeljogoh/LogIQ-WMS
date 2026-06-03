import type { PrismaClient } from "../../../../generated/prisma/client";
import type { SeedContext } from "../types";

export async function seedRouting(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  await db.routingRule.createMany({
    data: [
      {
        accountId: ctx.accountId,
        merchantId: ctx.apexId,
        priority: 10,
        name: "West Coast orders → LAX",
        conditions: { shippingState: ["CA", "OR", "WA", "NV", "AZ"] },
        action: "ASSIGN_TO_WAREHOUSE",
        warehouseId: ctx.laxId,
        isActive: true,
      },
      {
        accountId: ctx.accountId,
        merchantId: ctx.novatechId,
        priority: 10,
        name: "Midwest orders → ORD",
        conditions: { shippingState: ["IL", "OH", "MI", "IN", "WI", "MN"] },
        action: "ASSIGN_TO_WAREHOUSE",
        warehouseId: ctx.ordId,
        isActive: true,
      },
      {
        accountId: ctx.accountId,
        merchantId: null,
        priority: 1,
        name: "Default — assign nearest warehouse",
        conditions: {},
        action: "ASSIGN_NEAREST",
        warehouseId: null,
        isActive: true,
      },
    ],
  });

  return ctx;
}

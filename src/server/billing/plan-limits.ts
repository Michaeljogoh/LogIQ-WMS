import { TRPCError } from "@trpc/server";
import { startOfMonth } from "date-fns";
import type { Plan, Prisma, PrismaClient } from "@/generated/prisma/client";
import { PLAN_LIMITS } from "@/server/billing/polar-config";

export function limitsForPlan(plan: Plan) {
  return PLAN_LIMITS[plan];
}

export async function assertWithinWarehouseLimit(
  db: Pick<PrismaClient, "warehouse">,
  accountId: string,
  plan: Plan,
) {
  const limits = PLAN_LIMITS[plan];
  if (limits.warehouses === Number.POSITIVE_INFINITY) {
    return;
  }
  const count = await db.warehouse.count({ where: { accountId } });
  if (count >= limits.warehouses) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your plan allows ${limits.warehouses} warehouse(s). Upgrade to add more.`,
    });
  }
}

export async function assertWithinMerchantLimit(
  db: Pick<PrismaClient, "merchant">,
  accountId: string,
  plan: Plan,
) {
  const limits = PLAN_LIMITS[plan];
  if (limits.merchants === Number.POSITIVE_INFINITY) {
    return;
  }
  const count = await db.merchant.count({ where: { accountId } });
  if (count >= limits.merchants) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your plan allows ${limits.merchants} merchant(s). Upgrade to add more.`,
    });
  }
}

/** True when the *next* order created should emit an overage usage event (count already at/above soft cap). */
export async function shouldMeterOrderOverage(
  tx: Prisma.TransactionClient,
  accountId: string,
): Promise<boolean> {
  const account = await tx.logiqAccount.findUnique({
    where: { id: accountId },
    select: { plan: true },
  });
  if (!account) {
    return false;
  }
  const cap = PLAN_LIMITS[account.plan].ordersPerMonth;
  if (cap === Number.POSITIVE_INFINITY) {
    return false;
  }
  const monthStart = startOfMonth(new Date());
  const orderCount = await tx.order.count({
    where: {
      accountId,
      createdAt: { gte: monthStart },
      status: { not: "CANCELLED" },
    },
  });
  return orderCount >= cap;
}

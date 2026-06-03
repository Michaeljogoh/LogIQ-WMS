import type { PrismaClient } from "../../../../generated/prisma/client";
import type { SeedContext } from "../types";
import {
  DEMO_MANAGER_EMAIL,
  DEMO_OWNER_EMAIL,
  DEMO_SLUG,
  DEMO_STAFF1_EMAIL,
  DEMO_STAFF2_EMAIL,
} from "../types";

export async function seedAccount(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const account = await db.logiqAccount.create({
    data: {
      betterAuthOrgId: ctx.orgId,
      name: "Demo 3PL Co",
      slug: DEMO_SLUG,
      plan: "GROWTH",
    },
  });

  const [owner, manager, staff1, staff2] = await Promise.all([
    db.accountUser.create({
      data: {
        accountId: account.id,
        betterAuthUserId: ctx.ownerAuthUserId,
        systemRole: "THREEPL_ACCOUNT_OWNER",
        email: DEMO_OWNER_EMAIL,
        firstName: "Demo",
        lastName: "Operator",
      },
    }),
    db.accountUser.create({
      data: {
        accountId: account.id,
        betterAuthUserId: ctx.managerAuthUserId,
        systemRole: "WAREHOUSE_MANAGER",
        email: DEMO_MANAGER_EMAIL,
        firstName: "Sam",
        lastName: "Manager",
      },
    }),
    db.accountUser.create({
      data: {
        accountId: account.id,
        betterAuthUserId: ctx.staff1AuthUserId,
        systemRole: "WAREHOUSE_STAFF",
        email: DEMO_STAFF1_EMAIL,
        firstName: "Jake",
        lastName: "Wilson",
      },
    }),
    db.accountUser.create({
      data: {
        accountId: account.id,
        betterAuthUserId: ctx.staff2AuthUserId,
        systemRole: "WAREHOUSE_STAFF",
        email: DEMO_STAFF2_EMAIL,
        firstName: "Amy",
        lastName: "Chen",
      },
    }),
  ]);

  return {
    ...ctx,
    accountId: account.id,
    ownerAccountUserId: owner.id,
    managerAccountUserId: manager.id,
    staff1AccountUserId: staff1.id,
    staff2AccountUserId: staff2.id,
  };
}

import { TRPCError } from "@trpc/server";
import type { SystemRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { revokeBetterAuthSessions } from "@/lib/revoke-sessions";

export async function isBetterAuthUserAccessDisabled(
  betterAuthUserId: string,
): Promise<boolean> {
  const [operator, merchant] = await Promise.all([
    db.accountUser.findUnique({
      where: { betterAuthUserId },
      select: { isActive: true, systemRole: true },
    }),
    db.merchantUser.findFirst({
      where: { betterAuthUserId },
      select: { isActive: true },
    }),
  ]);

  if (operator?.systemRole === "PLATFORM_ADMIN") {
    return false;
  }

  if (operator && !operator.isActive) {
    return true;
  }

  if (merchant && !merchant.isActive) {
    return true;
  }

  return false;
}

export async function assertBetterAuthUserIsActive(
  betterAuthUserId: string,
): Promise<void> {
  if (await isBetterAuthUserAccessDisabled(betterAuthUserId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This account has been deactivated. Contact your administrator or LogIQ support.",
    });
  }
}

const OPERATOR_ROLES: SystemRole[] = [
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
];

export function isConfigurableOperatorRole(role: SystemRole): boolean {
  return OPERATOR_ROLES.includes(role);
}

export async function setOperatorActiveState(params: {
  accountUserId: string;
  isActive: boolean;
}): Promise<{ betterAuthUserId: string }> {
  const user = await db.accountUser.findUnique({
    where: { id: params.accountUserId },
    select: {
      id: true,
      betterAuthUserId: true,
      systemRole: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  if (user.systemRole === "PLATFORM_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform admin accounts cannot be deactivated.",
    });
  }

  await db.accountUser.update({
    where: { id: user.id },
    data: {
      isActive: params.isActive,
      deactivatedAt: params.isActive ? null : new Date(),
    },
  });

  if (!params.isActive) {
    await revokeBetterAuthSessions(user.betterAuthUserId);
  }

  return { betterAuthUserId: user.betterAuthUserId };
}

export async function setMerchantUserActiveState(params: {
  merchantUserId: string;
  isActive: boolean;
}): Promise<{ betterAuthUserId: string | null }> {
  const user = await db.merchantUser.findUnique({
    where: { id: params.merchantUserId },
    select: { id: true, betterAuthUserId: true },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  await db.merchantUser.update({
    where: { id: user.id },
    data: {
      isActive: params.isActive,
      deactivatedAt: params.isActive ? null : new Date(),
    },
  });

  if (!params.isActive && user.betterAuthUserId) {
    await revokeBetterAuthSessions(user.betterAuthUserId);
  }

  return { betterAuthUserId: user.betterAuthUserId };
}

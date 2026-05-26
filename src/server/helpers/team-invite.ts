import { TRPCError } from "@trpc/server";
import type {
  Prisma,
  SystemRole,
  WarehousePermission,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendOperatorTeamInviteEmail } from "@/lib/email";
import {
  generateTemporaryPassword,
  splitName,
  upsertCredentialAuthUser,
} from "@/server/helpers/auth-credential-user";
import { systemRoleToOrgMemberRole } from "@/server/helpers/tenant-sync";

const INVITE_ROLES = ["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"] as const;
export type InvitableOperatorRole = (typeof INVITE_ROLES)[number];

export function isInvitableOperatorRole(
  role: string,
): role is InvitableOperatorRole {
  return INVITE_ROLES.includes(role as InvitableOperatorRole);
}

export { generateTemporaryPassword } from "@/server/helpers/auth-credential-user";

async function ensureOrgMember(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    userId: string;
    systemRole: InvitableOperatorRole;
  },
) {
  const orgRole = systemRoleToOrgMemberRole(params.systemRole);
  await tx.member.upsert({
    where: {
      organizationId_userId: {
        organizationId: params.organizationId,
        userId: params.userId,
      },
    },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      role: orgRole,
    },
    update: {
      role: orgRole,
    },
  });
}

export type InviteTeamMemberInput = {
  accountId: string;
  inviterAccountUserId: string;
  email: string;
  name: string;
  systemRole: InvitableOperatorRole;
  warehouseIds: string[];
  permissions: WarehousePermission[];
};

export async function inviteTeamMember(
  input: InviteTeamMemberInput,
): Promise<{ accountUserId: string }> {
  const email = input.email.trim().toLowerCase();
  const { firstName, lastName } = splitName(input.name);

  if (input.warehouseIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select at least one warehouse.",
    });
  }

  if (
    input.systemRole === "WAREHOUSE_STAFF" &&
    input.permissions.length === 0
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select at least one permission for warehouse staff.",
    });
  }

  const account = await db.logiqAccount.findUnique({
    where: { id: input.accountId },
    select: { id: true, name: true, betterAuthOrgId: true },
  });
  if (!account) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
  }

  const warehouses = await db.warehouse.findMany({
    where: {
      accountId: input.accountId,
      id: { in: input.warehouseIds },
    },
    select: { id: true, name: true, code: true },
  });

  if (warehouses.length !== input.warehouseIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more warehouses are invalid for this account.",
    });
  }

  const existingOnAccount = await db.accountUser.findFirst({
    where: { accountId: input.accountId, email },
  });
  if (
    existingOnAccount?.systemRole === "THREEPL_ACCOUNT_OWNER" ||
    existingOnAccount?.systemRole === "PLATFORM_ADMIN"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This email belongs to an account owner and cannot be re-invited.",
    });
  }

  const existingAuthUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingAuthUser) {
    const otherTenant = await db.accountUser.findFirst({
      where: {
        betterAuthUserId: existingAuthUser.id,
        accountId: { not: input.accountId },
      },
    });
    if (otherTenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This email is already linked to another organisation.",
      });
    }

    const merchantLink = await db.merchantUser.findFirst({
      where: { betterAuthUserId: existingAuthUser.id },
    });
    if (merchantLink) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "This email is registered as a merchant user. Use a different work email.",
      });
    }
  }

  const temporaryPassword = generateTemporaryPassword();
  const authUser = await upsertCredentialAuthUser({
    email,
    name: input.name.trim(),
    password: temporaryPassword,
  });

  const accountUser = await db.$transaction(async (tx) => {
    const operator = await tx.accountUser.upsert({
      where: { betterAuthUserId: authUser.id },
      create: {
        accountId: input.accountId,
        betterAuthUserId: authUser.id,
        systemRole: input.systemRole,
        email,
        firstName,
        lastName,
      },
      update: {
        accountId: input.accountId,
        systemRole: input.systemRole,
        email,
        firstName,
        lastName,
      },
    });

    await tx.warehouseStaffAssignment.deleteMany({
      where: { userId: operator.id, accountId: input.accountId },
    });
    await tx.warehouseManager.deleteMany({
      where: { userId: operator.id, accountId: input.accountId },
    });

    if (input.systemRole === "WAREHOUSE_MANAGER") {
      for (const warehouseId of input.warehouseIds) {
        await tx.warehouseManager.create({
          data: {
            accountId: input.accountId,
            userId: operator.id,
            warehouseId,
            assignedBy: input.inviterAccountUserId,
          },
        });
      }
    }

    if (input.systemRole === "WAREHOUSE_STAFF") {
      const perms = input.permissions;
      for (const warehouseId of input.warehouseIds) {
        await tx.warehouseStaffAssignment.create({
          data: {
            accountId: input.accountId,
            userId: operator.id,
            warehouseId,
            permissions: perms,
            assignedBy: input.inviterAccountUserId,
          },
        });
      }
    }

    await ensureOrgMember(tx, {
      organizationId: account.betterAuthOrgId,
      userId: authUser.id,
      systemRole: input.systemRole,
    });

    return operator;
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";

  const roleLabel =
    input.systemRole === "WAREHOUSE_MANAGER"
      ? "Warehouse Manager"
      : "Warehouse Staff";

  await sendOperatorTeamInviteEmail({
    to: email,
    accountName: account.name,
    roleLabel,
    warehouseNames: warehouses.map((w) => w.name),
    signInUrl: `${baseUrl}/sign-in`,
    resetPasswordUrl: `${baseUrl}/forgot-password`,
    email,
    temporaryPassword,
  });

  return { accountUserId: accountUser.id };
}

export function formatSystemRoleLabel(role: SystemRole): string {
  switch (role) {
    case "THREEPL_ACCOUNT_OWNER":
      return "3PL Account Owner";
    case "WAREHOUSE_MANAGER":
      return "Warehouse Manager";
    case "WAREHOUSE_STAFF":
      return "Warehouse Staff";
    case "PLATFORM_ADMIN":
      return "Platform Admin";
    default:
      return role;
  }
}

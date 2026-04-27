import type { SystemRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type BasicUser = {
  id: string;
  email: string;
  name?: string | null;
};

type BasicOrg = {
  id: string;
  name: string;
  slug: string;
};

type BasicMember = {
  role: string;
};

export function orgMemberRoleToSystemRole(orgRole: string): SystemRole {
  switch (orgRole) {
    case "owner":
      return "THREEPL_ACCOUNT_OWNER";
    case "admin":
      return "WAREHOUSE_MANAGER";
    case "member":
      return "WAREHOUSE_STAFF";
    default:
      return "WAREHOUSE_STAFF";
  }
}

export async function upsertLogiqAccount(
  organization: BasicOrg,
): Promise<void> {
  await db.logiqAccount.upsert({
    where: { betterAuthOrgId: organization.id },
    create: {
      betterAuthOrgId: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    update: {
      name: organization.name,
      slug: organization.slug,
    },
  });
}

export async function syncAccountUserForMember(
  organization: BasicOrg,
  member: BasicMember,
  user: BasicUser,
): Promise<void> {
  await upsertLogiqAccount(organization);

  const account = await db.logiqAccount.findUniqueOrThrow({
    where: { betterAuthOrgId: organization.id },
  });

  const systemRole = orgMemberRoleToSystemRole(member.role);

  await db.accountUser.upsert({
    where: { betterAuthUserId: user.id },
    create: {
      accountId: account.id,
      betterAuthUserId: user.id,
      systemRole,
      email: user.email,
      firstName: user.name?.split(/\s+/)[0] ?? null,
      lastName: user.name?.split(/\s+/).slice(1).join(" ") || null,
    },
    update: {
      accountId: account.id,
      systemRole,
      email: user.email,
    },
  });
}

import type {
  MerchantPermission,
  MerchantUser,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type SessionTenantFields = {
  accountId: string;
  systemRole: string;
  managedWarehouseIds: string[];
  warehouseAssignments: string;
  merchantId: string | null;
  merchantPermissions: string[];
};

function merchantUserToTenantFields(
  merchantUser: MerchantUser,
): SessionTenantFields {
  const perms =
    merchantUser.systemRole === "MERCHANT_OWNER"
      ? (["READ", "WRITE", "BILLING"] as const)
      : merchantUser.permissions.map((p: MerchantPermission) => String(p));

  return {
    accountId: merchantUser.accountId,
    systemRole: merchantUser.systemRole,
    managedWarehouseIds: [],
    warehouseAssignments: "[]",
    merchantId: merchantUser.merchantId,
    merchantPermissions: [...perms],
  };
}

async function linkPendingMerchantInviteByEmail(
  betterAuthUserId: string,
): Promise<MerchantUser | null> {
  const authUser = await db.user.findUnique({
    where: { id: betterAuthUserId },
    select: { email: true },
  });
  if (!authUser?.email) {
    return null;
  }

  const pending = await db.merchantUser.findMany({
    where: {
      email: { equals: authUser.email, mode: "insensitive" },
      betterAuthUserId: null,
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  if (pending.length !== 1) {
    return null;
  }

  return db.merchantUser.update({
    where: { id: pending[0].id },
    data: { betterAuthUserId },
  });
}

export async function buildSessionTenantFields(
  betterAuthUserId: string,
): Promise<SessionTenantFields | null> {
  const operator = await db.accountUser.findUnique({
    where: { betterAuthUserId },
    include: {
      managedWarehouses: { select: { warehouseId: true } },
      warehouseAssignments: {
        select: { warehouseId: true, permissions: true },
      },
    },
  });

  if (operator) {
    const managedWarehouseIds = operator.managedWarehouses.map(
      (m) => m.warehouseId,
    );
    const assignments = operator.warehouseAssignments.map((a) => ({
      warehouseId: a.warehouseId,
      permissions: a.permissions.map((p) => String(p)),
    }));

    return {
      accountId: operator.accountId,
      systemRole: operator.systemRole,
      managedWarehouseIds,
      warehouseAssignments: JSON.stringify(assignments),
      merchantId: null,
      merchantPermissions: [],
    };
  }

  let merchantUser = await db.merchantUser.findFirst({
    where: {
      betterAuthUserId,
    },
  });

  if (!merchantUser) {
    merchantUser = await linkPendingMerchantInviteByEmail(betterAuthUserId);
  }

  if (merchantUser) {
    return merchantUserToTenantFields(merchantUser);
  }

  return null;
}

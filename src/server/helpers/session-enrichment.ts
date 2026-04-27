import type { MerchantPermission } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type SessionTenantFields = {
  accountId: string;
  systemRole: string;
  managedWarehouseIds: string[];
  warehouseAssignments: string;
  merchantId: string | null;
  merchantPermissions: string[];
};

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

  const merchantUser = await db.merchantUser.findFirst({
    where: {
      betterAuthUserId,
    },
  });

  if (merchantUser) {
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

  return null;
}

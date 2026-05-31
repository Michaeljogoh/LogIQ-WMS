import type { SystemRole } from "@/lib/system-roles";

export type WarehousePermission = "PICK" | "PACK" | "RECEIVE";
export type MerchantPermission = "READ" | "WRITE" | "BILLING";

export type SystemCapability =
  | "access_all_accounts"
  | "account_settings_billing"
  | "manage_warehouses"
  | "onboard_merchants"
  | "assign_warehouse_manager"
  | "assign_warehouse_staff"
  | "inventory_management"
  | "inbound_operations"
  | "outbound_operations"
  | "warehouse_analytics"
  | "pick_operations"
  | "pack_operations"
  | "receive_operations"
  | "merchant_portal_read"
  | "merchant_portal_write"
  | "merchant_billing"
  | "manage_merchant_team";

export type PermissionContext = {
  warehousePermissions?: WarehousePermission[];
  merchantPermissions?: MerchantPermission[];
  /** Staff: at least one warehouse assignment with RECEIVE */
  hasReceiveAssignment?: boolean;
  hasPickAssignment?: boolean;
  hasPackAssignment?: boolean;
};

const MATRIX: Record<SystemCapability, readonly SystemRole[]> = {
  access_all_accounts: ["PLATFORM_ADMIN"],
  account_settings_billing: ["PLATFORM_ADMIN", "THREEPL_ACCOUNT_OWNER"],
  manage_warehouses: ["PLATFORM_ADMIN", "THREEPL_ACCOUNT_OWNER"],
  onboard_merchants: ["PLATFORM_ADMIN", "THREEPL_ACCOUNT_OWNER"],
  assign_warehouse_manager: ["PLATFORM_ADMIN", "THREEPL_ACCOUNT_OWNER"],
  assign_warehouse_staff: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "WAREHOUSE_MANAGER",
  ],
  inventory_management: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "WAREHOUSE_MANAGER",
  ],
  inbound_operations: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "WAREHOUSE_MANAGER",
    "WAREHOUSE_STAFF",
  ],
  outbound_operations: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "WAREHOUSE_MANAGER",
    "WAREHOUSE_STAFF",
  ],
  warehouse_analytics: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "WAREHOUSE_MANAGER",
  ],
  pick_operations: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "WAREHOUSE_MANAGER",
    "WAREHOUSE_STAFF",
  ],
  pack_operations: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "WAREHOUSE_MANAGER",
    "WAREHOUSE_STAFF",
  ],
  receive_operations: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "WAREHOUSE_MANAGER",
    "WAREHOUSE_STAFF",
  ],
  merchant_portal_read: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "MERCHANT_OWNER",
    "MERCHANT_USER",
  ],
  merchant_portal_write: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "MERCHANT_OWNER",
    "MERCHANT_USER",
  ],
  merchant_billing: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "MERCHANT_OWNER",
    "MERCHANT_USER",
  ],
  manage_merchant_team: [
    "PLATFORM_ADMIN",
    "THREEPL_ACCOUNT_OWNER",
    "MERCHANT_OWNER",
  ],
};

function roleAllowed(
  role: string | null | undefined,
  capability: SystemCapability,
): boolean {
  if (!role) {
    return false;
  }
  return MATRIX[capability].includes(role as SystemRole);
}

function staffHasWarehousePerm(
  ctx: PermissionContext,
  perm: WarehousePermission,
): boolean {
  return (ctx.warehousePermissions ?? []).includes(perm);
}

function merchantHasPerm(
  ctx: PermissionContext,
  perm: MerchantPermission,
): boolean {
  if ((ctx.merchantPermissions ?? []).includes(perm)) {
    return true;
  }
  return false;
}

/**
 * Central permission matrix for UI and API guards.
 * Platform admin is allowed for every capability.
 */
export function hasSystemCapability(
  role: string | null | undefined,
  capability: SystemCapability,
  ctx: PermissionContext = {},
): boolean {
  if (role === "PLATFORM_ADMIN") {
    return true;
  }

  if (!roleAllowed(role, capability)) {
    return false;
  }

  switch (capability) {
    case "inbound_operations":
      if (role === "WAREHOUSE_STAFF") {
        return staffHasWarehousePerm(ctx, "RECEIVE");
      }
      return true;
    case "outbound_operations":
      if (role === "WAREHOUSE_STAFF") {
        return (
          staffHasWarehousePerm(ctx, "PICK") ||
          staffHasWarehousePerm(ctx, "PACK")
        );
      }
      return true;
    case "pick_operations":
      if (role === "WAREHOUSE_STAFF") {
        return staffHasWarehousePerm(ctx, "PICK");
      }
      return true;
    case "pack_operations":
      if (role === "WAREHOUSE_STAFF") {
        return staffHasWarehousePerm(ctx, "PACK");
      }
      return true;
    case "receive_operations":
      if (role === "WAREHOUSE_STAFF") {
        return staffHasWarehousePerm(ctx, "RECEIVE");
      }
      return true;
    case "merchant_portal_read":
      if (role === "MERCHANT_USER") {
        return merchantHasPerm(ctx, "READ");
      }
      return true;
    case "merchant_portal_write":
      if (role === "MERCHANT_USER") {
        return merchantHasPerm(ctx, "WRITE");
      }
      return role === "MERCHANT_OWNER";
    case "merchant_billing":
      if (role === "MERCHANT_USER") {
        return merchantHasPerm(ctx, "BILLING");
      }
      return role === "MERCHANT_OWNER";
    default:
      return true;
  }
}

export function getDashboardKind(
  role: string | null | undefined,
): "platform" | "operator" | "merchant" | null {
  switch (role) {
    case "PLATFORM_ADMIN":
      return "platform";
    case "THREEPL_ACCOUNT_OWNER":
    case "WAREHOUSE_MANAGER":
    case "WAREHOUSE_STAFF":
      return "operator";
    case "MERCHANT_OWNER":
    case "MERCHANT_USER":
      return "merchant";
    default:
      return null;
  }
}

export function collectWarehousePermissions(
  assignments: { permissions: string[] }[],
): WarehousePermission[] {
  const set = new Set<WarehousePermission>();
  for (const a of assignments) {
    for (const p of a.permissions) {
      if (p === "PICK" || p === "PACK" || p === "RECEIVE") {
        set.add(p);
      }
    }
  }
  return [...set];
}

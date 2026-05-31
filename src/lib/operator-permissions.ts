import { hasSystemCapability } from "@/lib/system-permissions";

/** Operator roles that manage the 3PL account (billing, team, merchants, warehouses). */
export function isOperatorAccountOwner(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "account_settings_billing");
}

export function canManageOperatorBilling(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "account_settings_billing");
}

export function canManageOperatorTeam(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "assign_warehouse_manager");
}

export function canCreateWarehouse(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "manage_warehouses");
}

export function canCreateMerchant(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "onboard_merchants");
}

export function canAccessOperatorOnboarding(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "onboard_merchants");
}

export function canRunLogiqJobs(
  systemRole: string | null | undefined,
): boolean {
  return (
    systemRole === "THREEPL_ACCOUNT_OWNER" || systemRole === "PLATFORM_ADMIN"
  );
}

export function canManageLabelTemplates(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "inventory_management");
}

export function canManageEscalationRules(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "account_settings_billing");
}

export function canAssignWarehouseStaff(
  systemRole: string | null | undefined,
): boolean {
  return hasSystemCapability(systemRole, "assign_warehouse_staff");
}

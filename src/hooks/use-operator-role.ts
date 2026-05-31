"use client";

import type { SessionUser } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import {
  canAccessOperatorOnboarding,
  canCreateMerchant,
  canCreateWarehouse,
  canAssignWarehouseStaff,
  canManageEscalationRules,
  canManageLabelTemplates,
  canManageOperatorBilling,
  canManageOperatorTeam,
  isOperatorAccountOwner,
} from "@/lib/operator-permissions";

export function useOperatorRole() {
  const { data: session, isPending } = authClient.useSession();
  const systemRole =
    (session?.user as SessionUser | undefined)?.systemRole ?? null;

  return {
    systemRole,
    isPending,
    isAccountOwner: isOperatorAccountOwner(systemRole),
    canManageBilling: canManageOperatorBilling(systemRole),
    canManageTeam: canManageOperatorTeam(systemRole),
    canCreateWarehouse: canCreateWarehouse(systemRole),
    canCreateMerchant: canCreateMerchant(systemRole),
    canAccessOnboarding: canAccessOperatorOnboarding(systemRole),
    canManageLabelTemplates: canManageLabelTemplates(systemRole),
    canManageEscalationRules: canManageEscalationRules(systemRole),
    canAssignWarehouseStaff: canAssignWarehouseStaff(systemRole),
  };
}

import type { SessionUser } from "@/lib/auth-client";
import { getDashboardKind } from "@/lib/system-permissions";

const PLATFORM_DASHBOARD = "/platform/dashboard";
const OPERATOR_DASHBOARD = "/dashboard";
const MERCHANT_DASHBOARD = "/portal/dashboard";

export function resolvePostAuthRedirect(user: SessionUser | undefined): string {
  const kind = getDashboardKind(user?.systemRole);
  if (kind === "platform") {
    return PLATFORM_DASHBOARD;
  }
  if (kind === "merchant") {
    return MERCHANT_DASHBOARD;
  }
  return OPERATOR_DASHBOARD;
}

export function getHomeHrefForRole(
  systemRole: string | null | undefined,
): string {
  return resolvePostAuthRedirect({ systemRole } as SessionUser);
}

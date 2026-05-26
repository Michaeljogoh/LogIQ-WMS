import type { SessionUser } from "@/lib/auth-client";

const OPERATOR_DASHBOARD = "/dashboard";
const MERCHANT_DASHBOARD = "/portal/dashboard";

export function resolvePostAuthRedirect(user: SessionUser | undefined): string {
  const role = user?.systemRole;
  if (role === "MERCHANT_OWNER" || role === "MERCHANT_USER") {
    return MERCHANT_DASHBOARD;
  }
  return OPERATOR_DASHBOARD;
}

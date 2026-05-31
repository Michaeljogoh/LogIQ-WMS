export const SYSTEM_ROLES = [
  "PLATFORM_ADMIN",
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "MERCHANT_OWNER",
  "MERCHANT_USER",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export function isSystemRole(value: string | null | undefined): value is SystemRole {
  return SYSTEM_ROLES.includes(value as SystemRole);
}

export const PLATFORM_INTERNAL_ACCOUNT_SLUG = "logiq-platform-internal";

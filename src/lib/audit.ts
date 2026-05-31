import { SYSTEM_ROLES, type SystemRole } from "@/lib/system-roles";

export const AUDIT_EVENT_SOURCES = [
  "TRPC",
  "SUPPORT",
  "AUTH",
  "SYSTEM",
] as const;

export type AuditEventSource = (typeof AUDIT_EVENT_SOURCES)[number];

export const AUDIT_ROLE_LABELS: Record<SystemRole, string> = {
  PLATFORM_ADMIN: "Platform admin",
  THREEPL_ACCOUNT_OWNER: "3PL account owner",
  WAREHOUSE_MANAGER: "Warehouse manager",
  WAREHOUSE_STAFF: "Warehouse staff",
  MERCHANT_OWNER: "Merchant owner",
  MERCHANT_USER: "Merchant user",
};

export const AUDIT_ROLE_OPTIONS = SYSTEM_ROLES.map((role) => ({
  value: role,
  label: AUDIT_ROLE_LABELS[role],
}));

/** tRPC paths that already log explicitly or must not be audited. */
export const AUDIT_SKIP_PROCEDURE_PREFIXES = [
  "platformSupport.",
  "platformAudit.",
] as const;

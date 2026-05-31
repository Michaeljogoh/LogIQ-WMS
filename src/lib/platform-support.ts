/** HTTP-only cookie referencing an active `PlatformSupportSession` row. */
export const PLATFORM_SUPPORT_SESSION_COOKIE = "logiq_support_session_id";

/** Short-lived proof of MFA after OTP verify before starting emergency session. */
export const PLATFORM_SUPPORT_MFA_COOKIE = "logiq_support_mfa_verified_at";

/** @deprecated Use {@link PLATFORM_SUPPORT_SESSION_COOKIE} via support sessions. */
export const PLATFORM_ACTIVE_ACCOUNT_COOKIE = "logiq_active_account_id";

export const SUPPORT_CONSTANTS = {
  readOnlySessionHours: 8,
  emergencySessionHours: 2,
  accessRequestExpiryHours: 72,
  mfaVerificationWindowMinutes: 10,
} as const;

export type PlatformSupportLevel =
  | "READ_ONLY"
  | "EMERGENCY_IMPERSONATION";

export const ESCALATED_SUPPORT_ACTIONS = [
  "UNLOCK_STUCK_SHIPMENT",
  "REQUEUE_WEBHOOK",
  "REGENERATE_LABEL",
  "RETRY_SYNC",
] as const;

export type EscalatedSupportAction =
  (typeof ESCALATED_SUPPORT_ACTIONS)[number];

export const ESCALATED_ACTION_LABELS: Record<EscalatedSupportAction, string> = {
  UNLOCK_STUCK_SHIPMENT: "Unlock stuck shipment",
  REQUEUE_WEBHOOK: "Requeue webhook delivery",
  REGENERATE_LABEL: "Regenerate shipping label",
  RETRY_SYNC: "Retry integration sync",
};

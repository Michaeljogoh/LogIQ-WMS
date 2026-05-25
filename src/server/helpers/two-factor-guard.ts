import {
  needsOperatorSignupOtp,
  type TwoFactorUserFlags,
} from "@/lib/two-factor-policy";

const AUTH_PATH_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/merchant/sign-in",
  "/forgot-password",
  "/reset-password",
  "/two-factor",
  "/api/auth",
] as const;

export function isAuthExemptPath(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export type TwoFactorGuardInput = TwoFactorUserFlags & {
  pathname: string;
  hasSession: boolean;
};

export type TwoFactorGuardResult =
  | { action: "none" }
  | { action: "redirect"; path: "/two-factor/enroll" };

export function resolveTwoFactorGuard(
  input: TwoFactorGuardInput,
): TwoFactorGuardResult {
  if (!input.hasSession) {
    return { action: "none" };
  }
  if (isAuthExemptPath(input.pathname)) {
    return { action: "none" };
  }

  if (needsOperatorSignupOtp(input)) {
    return { action: "redirect", path: "/two-factor/enroll" };
  }

  return { action: "none" };
}

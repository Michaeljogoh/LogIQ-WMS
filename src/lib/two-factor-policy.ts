/** User fields used for 2FA policy (Better Auth + app flags). */
export type TwoFactorUserFlags = {
  twoFactorEnabled?: boolean | null;
  twoFactorSetupCompleted?: boolean | null;
  accountId?: string | null;
};

export function canDisableTwoFactor(_user: TwoFactorUserFlags): boolean {
  return true;
}

/** Operator sign-up: must verify email OTP before using the app (no workspace yet). */
export function needsOperatorSignupOtp(user: TwoFactorUserFlags): boolean {
  return (
    !user.accountId &&
    user.twoFactorEnabled !== true &&
    user.twoFactorSetupCompleted !== true
  );
}

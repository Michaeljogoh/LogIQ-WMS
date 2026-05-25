# Two-factor authentication (email OTP)

**Date:** 2026-05-16  
**Status:** shipped  
**Area:** Authentication / security

## Summary

Better Auth email OTP for operators and merchants. Operator sign-up: form → auto-enable 2FA + email code → OTP page → dashboard. Sign-in when 2FA is on: password → `/two-factor` OTP → dashboard. Users can disable 2FA in Settings → Security (on by default after first verification).

## Operator flows

### Sign-up
1. `/sign-up` → `signUp` + `signIn`
2. Client calls `twoFactor.enable` + `sendOtp` (password not shown again)
3. `/two-factor/enroll` — OTP only (“Secure your operator account”)
4. Verify → `/dashboard` (workspace pending card if no org yet)

### Sign-in
1. `/sign-in` → `twoFactorRedirect` → `/two-factor?callbackURL=/dashboard`
2. Verify OTP → `/dashboard`

## Policy

- `twoFactorSetupCompleted` set after first successful OTP verification
- No forced `/two-factor/setup` on login
- `twoFactorRequired` / disable lock removed — all users may turn off 2FA in settings
- Proxy only redirects to `/two-factor/enroll` when signed in without workspace and 2FA not verified

## Key files

- `src/components/auth/two-factor-code-form.tsx` — shared OTP UI
- `src/components/auth/two-factor-enrollment-form.tsx` — sign-up completion
- `src/components/auth/two-factor-verify-form.tsx` — sign-in challenge
- `src/lib/two-factor-policy.ts`, `src/proxy.ts`
- `src/app/(dashboard)/layout.tsx` — allows dashboard without `accountId`

## Verify

1. Sign up → OTP only (no password on 2FA page) → dashboard welcome card
2. Sign out → sign in → OTP → dashboard
3. Settings → disable 2FA → sign in without OTP
4. Re-enable in settings → sign in with OTP again

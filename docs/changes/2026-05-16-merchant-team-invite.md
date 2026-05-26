# Merchant team invite flow (credential sign-in)

**Date:** 2026-05-16  
**Status:** shipped  
**Area:** Authentication / merchant portal

## Summary

Merchants sign in with email and password at `/merchant/sign-in` (no sign-up). 3PL owners create merchants and owners receive a temporary password by email. Merchant owners invite `MERCHANT_USER` team members with `READ` / `WRITE` / `BILLING` permissions—the same portal UI with restricted nav and API access.

## Scope

### In scope

- `merchant-team-invite.ts` — provision Better Auth user + `MerchantUser` + email
- `merchant.create` and `merchantUser.invite` use credential invite (no magic link)
- `MerchantSignInForm` replaces magic-link form
- Shared `auth-credential-user.ts` with operator `team-invite.ts`
- Remove `MerchantClaim` and `?merchantUserId=` bootstrap
- Team page: owner-only invite form, updated copy

### Out of scope

- `/merchant/sign-up`
- Forced password change on first login
- Merging `(portal)` and `(dashboard)` route groups

## Files changed

- `src/server/helpers/auth-credential-user.ts`
- `src/server/helpers/merchant-team-invite.ts`
- `src/server/helpers/team-invite.ts` — use shared credential helper
- `src/emails/merchant-team-invite.tsx`
- `src/lib/email.tsx` — `sendMerchantTeamInviteEmail`
- `src/server/api/routers/merchant.ts`
- `src/server/api/routers/merchant-user.ts`
- `src/components/auth/merchant-sign-in-form.tsx`
- `src/app/(auth)/merchant/sign-in/page.tsx`
- `src/app/(portal)/portal/dashboard/page.tsx`
- `src/app/(portal)/portal/team/page.tsx`
- `src/components/portal/portal-link-pending.tsx`

## How to verify

1. Sign in as 3PL owner → create merchant → check email for temp password.
2. Sign in at `/merchant/sign-in` → `/portal/dashboard`.
3. As merchant owner → **Team** → invite user with `READ` only → user signs in → limited sidebar.
4. Re-invite updates password; permission update revokes sessions.

## Related

- [Operator team invite](./2026-05-16-operator-team-invite-flow.md)
- [Auth pages redesign](./2026-05-16-auth-pages-redesign.md)

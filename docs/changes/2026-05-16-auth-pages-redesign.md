# Auth pages redesign (split layout)

**Date:** 2026-05-16  
**Status:** shipped (UI); password reset and 2FA are design-only  
**Area:** Authentication UI

## Summary

Operator and merchant sign-in/sign-up were rebuilt to match the new split-screen auth design (hero image left, form right). New pages were added for forgot password, reset password, and two-factor verification. Shared auth components centralize layout, fields, social buttons, and primary actions.

## Scope

### In scope

- Split-layout sign-in and sign-up with Google and UPS (no Facebook)
- Sign-in / sign-up use `fitViewport` on large screens to avoid page scroll
- Merchant magic-link sign-in using the same layout
- Forgot password page (email + inline Send button)
- Reset password page (centered layout, two password fields)
- Two-factor page (6-digit OTP UI, trust device checkbox)
- Hero images under `public/images/auth/`
- Auth layout no longer wraps pages in a centered card shell

### Out of scope

- Better Auth `sendInvitationEmail` / accept-invitation for warehouse team invites
- `afterAcceptInvitation` hook to sync `AccountUser` on org invite accept
- Wiring forgot password, reset password, and 2FA to Better Auth APIs
- Facebook OAuth (removed from UI)
- UPS sign-up OAuth (button is UI-only; shows toast)

## Files changed

### Layout & shared components

- `src/app/(auth)/layout.tsx` — full-bleed children only
- `src/components/auth/auth-split-layout.tsx` — split + centered layouts
- `src/components/auth/auth-assets.ts` — hero image paths
- `src/components/auth/auth-logo.tsx`
- `src/components/auth/auth-header.tsx`
- `src/components/auth/auth-field.tsx`
- `src/components/auth/auth-password-field.tsx`
- `src/components/auth/auth-primary-button.tsx`
- `src/components/auth/auth-divider.tsx`
- `src/components/auth/auth-social-buttons.tsx`

### Forms & pages

- `src/components/auth/operator-sign-in-form.tsx` — redesigned; links to `/forgot-password`
- `src/components/auth/operator-sign-up-form.tsx` — redesigned; confirm password + terms
- `src/components/auth/merchant-magic-link-form.tsx` — redesigned
- `src/components/auth/forgot-password-form.tsx` — **new**
- `src/components/auth/reset-password-form.tsx` — **new**
- `src/components/auth/two-factor-form.tsx` — **new**
- `src/app/(auth)/forgot-password/page.tsx` — **new**
- `src/app/(auth)/reset-password/page.tsx` — **new**
- `src/app/(auth)/two-factor/page.tsx` — **new**

### Assets

- `public/images/auth/sign-in.jpg`
- `public/images/auth/sign-up.jpg`
- `public/images/auth/forgot-password.jpg`
- `public/images/auth/two-factor.jpg`
- `public/images/auth/reset-password-bg.png`

## Routes / URLs

| Path | Description |
|------|-------------|
| `/sign-in` | Operator sign-in (email, Google, UPS) |
| `/sign-up` | Operator registration + organisation create |
| `/merchant/sign-in` | Merchant magic link |
| `/forgot-password` | Request reset link (UI mock) |
| `/reset-password` | Set new password (UI mock) |
| `/two-factor` | Email OTP verification (UI mock) |

## API / data

- **Better Auth:** existing `signIn.email`, `signUp.email`, `signIn.social`, `signIn.oauth2`, `signIn.magicLink`, `organization.create` unchanged
- **No Prisma migrations**
- **No new env vars** for this UI work

## How to verify

1. `npm run dev`
2. Open `/sign-in`, `/sign-up`, `/merchant/sign-in` — confirm split layout and working sign-in/sign-up where configured
3. Open `/forgot-password`, `/reset-password`, `/two-factor` — confirm layout; submit shows toast (no backend yet for reset/2FA)
4. From sign-in, use **Forgot Password?** → `/forgot-password`

## Follow-ups

- [ ] Wire `forgot-password` / `reset-password` to Better Auth password reset + email template
- [ ] Wire `/two-factor` when 2FA plugin is enabled
- [ ] Add `afterAcceptInvitation` in `src/lib/auth.ts` and `/accept-invitation` page for warehouse invites
- [ ] Configure `sendInvitationEmail` on the organisation plugin
- [ ] Optional: remove or hide Facebook button if not planned

## Related

- [Module 2 — Authentication & multi-tenancy](../modules/module-2-auth-multi-tenancy.md)

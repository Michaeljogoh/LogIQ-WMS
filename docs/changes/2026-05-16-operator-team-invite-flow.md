# Operator team invite flow (owner → manager / staff)

**Date:** 2026-05-16  
**Status:** shipped  
**Area:** Authentication / team management

## Summary

3PL account owners invite warehouse managers and staff from Settings → Users. The system provisions a Better Auth credential user, `AccountUser` row, warehouse scope, org membership, and sends an email with role, warehouses, temporary password, and sign-in / reset-password links.

## Scope

### In scope

- `accountUser.invite` tRPC mutation (owner / platform admin only)
- Invite dialog: name, email, role, warehouses, staff permissions
- Email: `operator-team-invite` template
- `WarehouseManager` / `WarehouseStaffAssignment` created at invite time
- Re-invite updates role, warehouses, and resets password
- `tenant-sync` no longer overwrites `systemRole` on existing `AccountUser` updates

### Out of scope

- Better Auth org `admin`/`member` invite UI
- Manager warehouse edit page (assign at invite; staff can use Edit access)
- Forced password change on first login

## Files changed

- `src/server/helpers/team-invite.ts` — provision user + assignments + email
- `src/server/helpers/tenant-sync.ts` — `systemRoleToOrgMemberRole`; preserve role on update
- `src/server/api/routers/account-user.ts` — `invite`, enriched `list`
- `src/components/settings/invite-team-member-form.tsx`
- `src/app/(dashboard)/settings/users/page.tsx`
- `src/emails/operator-team-invite.tsx`
- `src/lib/email.tsx` — `sendOperatorTeamInviteEmail`

## How to verify

1. Sign in as 3PL account owner.
2. Open **Settings → Users** → **Invite team member**.
3. Invite a staff user with warehouses and PICK/PACK/RECEIVE.
4. Check email (or console if `POSTMARK_SERVER_TOKEN` missing).
5. Sign in at `/sign-in` with emailed credentials → operator dashboard with correct scope.

## Related

- [Auth pages redesign](./2026-05-16-auth-pages-redesign.md)
- [Module 2 — Authentication](../modules/module-2-auth-multi-tenancy.md)

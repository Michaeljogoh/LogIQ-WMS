# Platform support tiers (L1 / L2 / L3)

## Summary

- **Level 1 (default):** Read-only support session — browse operator UI; all tRPC mutations blocked.
- **Level 2:** Escalated actions from `/platform/support` with reason, confirmation phrase, and audit log.
- **Level 3:** Emergency impersonation — owner email approval, 2FA re-verify, time-boxed session, red banner.

## Routes

- `/platform/support` — support console
- `/support-access/approve/[token]` — tenant owner approve/deny
- `POST /api/platform/support-session` — start/end sessions (cookies)
- `POST /api/platform/support-mfa` — record MFA verification before L3
- `POST /api/support-access/approve` — owner decision API

## Migration

Run `npx prisma migrate deploy` (migration `20260529140000_platform_support`).

## Platform-wide audit (`/platform/audit`)

- `audit_event` table records **all successful tRPC mutations** (operators, merchants, platform admins) plus explicit **support** events.
- Filter by **role**, tenant, source (API / Support / Auth / System), and action.
- Legacy `platform_support_audit_log` rows are backfilled into `audit_event`.

## Key files

- `src/lib/platform-support.ts` — cookies and constants
- `src/lib/audit.ts` — role labels and skip prefixes
- `src/server/helpers/audit-log.ts` — write + tRPC mutation hook
- `src/server/api/routers/platform-audit.ts` — audit UI API
- `src/server/helpers/platform-support-*.ts` — session, access, audit, actions
- `src/server/api/routers/platform-support.ts` — tRPC API
- `src/server/api/trpc.ts` — read-only mutation guard on `protectedProc`
- `src/components/platform/platform-support-console.tsx` — UI

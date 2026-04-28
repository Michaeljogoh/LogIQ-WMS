# Module 2 - Authentication & Multi-Tenancy

## Scope Implemented

This module establishes tenant-aware authentication context, role-aware procedure protection, and account-linked user/session behavior.

## Key Files

- `src/lib/auth.ts`
  - better-auth configuration and session fields extension pattern.

- `src/server/api/trpc.ts`
  - Core tRPC context creation and middleware:
    - linked tenant enforcement
    - role gate middleware
    - warehouse/merchant permission middleware

- `src/server/api/ctx-ids.ts`
  - Shared helpers to enforce linked account/user IDs in procedures.

- `prisma/schema.prisma`
  - Auth + tenant models and enums used by the app:
    - `LogiqAccount`, `AccountUser`
    - warehouse assignment models
    - merchant user models
    - role/permission enums

## Core Logic

- Session context enrichment:
  - Exposes `userId`, `accountId`, `systemRole`, warehouse and merchant permission context for downstream API logic.

- Tenant isolation:
  - Protected procedures require linked `userId` and `accountId`.
  - Data access patterns rely on `accountId` scoping.

- Role and permission middleware:
  - Role gate for platform/owner/manager/staff flows.
  - Warehouse/merchant permission checks for scoped capabilities.

## Security Principles Applied

- Unauthorized requests are rejected early.
- Procedure-level role checks are centralized in middleware.
- Account context is derived from session context, not trusted from client payload.

## Notes

- This module is the foundational dependency for all domain modules that follow.
- Later modules (inventory/inbound/outbound) rely on these middleware patterns for RBAC and tenancy.

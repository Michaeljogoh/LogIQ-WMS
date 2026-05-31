# Platform admin dashboard & permission matrix

## Summary

- Three dashboards: **Platform** (`/platform/dashboard`), **Operator** (`/dashboard`), **Merchant** (`/portal/dashboard`).
- `PLATFORM_ADMIN` seeded once on server start when `PLATFORM_ADMIN_PASSWORD` is set.
- Permission matrix in `src/lib/system-permissions.ts`.
- Platform admin selects a tenant via cookie, then uses operator UI in **support mode**.

## Platform admin login

Add to `.env`:

```env
PLATFORM_ADMIN_EMAIL=admin@logiq.internal
PLATFORM_ADMIN_PASSWORD=your-secure-password
PLATFORM_ADMIN_NAME=LogIQ Platform Admin
```

Restart the dev server. On first start, seed creates the internal account (`logiq-platform-internal`) and admin user. Subsequent starts skip if a `PLATFORM_ADMIN` already exists.

Sign in at `/sign-in` → redirected to `/platform/dashboard`.

## Support mode

1. Open **Accounts** → **Open operator workspace** on a tenant.
2. Cookie `logiq_active_account_id` scopes tRPC to that tenant.
3. Amber banner on operator layout; **Exit support mode** clears the cookie.

## Key files

- `src/lib/system-permissions.ts` — capability matrix
- `src/server/seed/platform-admin.ts` — idempotent seed
- `src/instrumentation.ts` — runs seed on Node startup
- `src/server/api/routers/platform.ts` — cross-tenant reads
- `src/app/(platform)/` — platform console UI
- `src/components/dashboard/warehouse-staff-dashboard.tsx` — staff home

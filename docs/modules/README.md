# Module Documentation

This folder contains implementation notes for each LogIQ module completed in this repository.

## Rule (mandatory)

Whenever a module from `AGENTS.md` is implemented or materially changed in code, add or update a markdown doc **in this directory** (`docs/modules/`). Keep it in sync with the real codebase (routes, routers, Prisma models, env vars, jobs).

**Naming:** `module-{order}-{short-slug}.md` — order matches the build table in `AGENTS.md` Section 1 (e.g. module 4 → `module-4-inbound.md`).

**Suggested sections for each doc:**

1. **Scope** — what shipped vs deferred
2. **Database** — Prisma models/enums touched; migration notes
3. **API** — tRPC routers/procedures (names only or brief contracts)
4. **UI** — App Router paths under `app/`
5. **Background jobs / integrations** — if applicable
6. **Configuration** — new or required env vars
7. **How to verify** — migrate, seed, manual test steps

## Modules Documented

- `module-2-auth-multi-tenancy.md`
- `module-3-inventory.md`
- `module-4-inbound.md`
- `module-5-outbound.md`
- `module-6-merchantos.md`
- `module-7-analytics-reporting.md`
- `module-8-integrations-hub.md`
- `module-9-notification-alert-center.md`
- `module-10-barcode-label-generation.md`
- `module-11-packaging-library.md`
- `module-12-batch-label-printing.md`
- `module-13-multi-warehouse-routing.md`
- `module-14-platform-billing-polar.md`
- `module-15-logiq-ai-copilot.md`

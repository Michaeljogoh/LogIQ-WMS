# Feature change log

Per-feature markdown notes for **incremental** product and engineering changes. Use this folder alongside `docs/modules/`, which documents full module scope.

## When to add a file

Create a new `.md` file here when you ship or materially change a feature, including:

- New routes, APIs, or UI flows
- Redesigns that touch multiple files
- Auth, billing, portal, or integration behavior changes
- Bug fixes that change user-visible behavior (optional but encouraged)

Do **not** duplicate entire module write-ups—link to `docs/modules/` when a change belongs to an existing module.

## File naming

```
YYYY-MM-DD-short-kebab-slug.md
```

Examples:

- `2026-05-16-auth-pages-redesign.md`
- `2026-05-20-warehouse-invite-accept-flow.md`

Use the **merge or ship date**. One feature per file; split large efforts into multiple dated files if they land on different days.

## Document format

Copy `TEMPLATE.md`, or use these sections:

| Section | Purpose |
|--------|---------|
| **Summary** | One paragraph: what changed and why |
| **Status** | `shipped` \| `in progress` \| `planned` |
| **Scope** | In scope / out of scope |
| **Files changed** | Paths grouped by area |
| **Routes / URLs** | New or updated App Router paths |
| **API / data** | tRPC, Prisma, jobs, env vars (if any) |
| **How to verify** | Steps to test locally |
| **Follow-ups** | Known gaps or next tasks |
| **Related** | Links to module docs, PRs, issues |

## Index

| Date | Feature | Status |
|------|---------|--------|
| 2026-05-16 | [Auth pages redesign](./2026-05-16-auth-pages-redesign.md) | shipped (UI); forgot/reset/2FA not wired to API |
| 2026-05-16 | [Operator team invite flow](./2026-05-16-operator-team-invite-flow.md) | shipped |

## Related documentation

- Module-level architecture: [`docs/modules/`](../modules/README.md)
- Auth & tenancy module: [`module-2-auth-multi-tenancy.md`](../modules/module-2-auth-multi-tenancy.md)

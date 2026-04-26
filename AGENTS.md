# LogIQ WMS

**Master AI Build Prompt**

_Complete specification for AI-assisted full-stack development_

**Stack:** Next.js 14 · TypeScript · tRPC · Prisma · PostgreSQL · better-auth · Polar · Claude API · Tailwind CSS · shadcn/ui

**Version 2.1 | April 2026 | Confidential**

---

# Section 1 — How To Use This Document

This document is a complete, self-contained master prompt designed to be fed to an AI coding assistant (Claude, GPT-4, Cursor, Windsurf, etc.) to build LogIQ WMS from scratch — one module at a time, in dependency order. Every section contains exact database models, business logic rules, API procedures, UI requirements, and validation constraints needed to implement that module fully.

> **Build order is strictly enforced.** Each module depends on models and logic defined in earlier modules. Do not skip ahead.

| Order | Module                                  | Depends On           |
| :---- | :-------------------------------------- | :------------------- |
| 1     | Project Scaffold & Standard Next.js App | Nothing — start here |
| 2     | Authentication & Multi-Tenancy          | Scaffold             |
| 3     | Inventory Management                    | Auth                 |
| 4     | Inbound — Purchase Orders & Receiving   | Inventory            |
| 5     | Outbound — Pick, Pack & Ship            | Inventory + PO       |
| 6     | MerchantOS — Merchant Portal            | Inventory + Orders   |
| 7     | Analytics & Reporting                   | All prior modules    |
| 8     | Integrations Hub                        | Orders + Inventory   |
| 9     | Notification & Alert Center             | All prior modules    |
| 10    | Barcode & Label Generation              | Inventory + Outbound |
| 11    | Packaging Library                       | Inventory + Outbound |
| 12    | Batch Label Printing & Print Queue      | Outbound + Packaging |
| 13    | Multi-Warehouse Routing Engine          | Inventory + Orders   |
| 14    | Platform Billing via Polar              | Auth + MerchantOS    |
| 15    | LogIQ — AI Co-Pilot Layer               | All prior modules    |

## Recommended Usage

1. Open a new AI coding session for each module. Paste the **System Context** (Section 2) first.
2. Then paste the module section you are building.
3. The AI will generate: Prisma schema additions, tRPC router, service layer, React components, Zod schemas.
4. After each module: run `prisma migrate dev`, run tests, commit, then move to the next.
5. Use `npx shadcn-ui@latest add <component>` to install shadcn/ui primitives (Button, Table, Card, Dialog, Form, etc.) before building module UIs. Configure Tailwind CSS via `tailwind.config.ts` with your design tokens and custom colours.

---

# Section 2 — System Context (Paste Into Every AI Session)

Copy the block below verbatim at the start of every AI coding session before pasting any module prompt.

## System Context Block

> You are a senior full-stack TypeScript engineer building LogIQ WMS, a multi-tenant Warehouse Management System with an embedded AI co-pilot.

## Engineering Quality Gate (Mandatory)

- Always produce production-quality code.
- Never leave new lint errors in touched files.
- Never leave TypeScript errors in touched files.
- Follow SOLID principles:
  - Single Responsibility Principle
  - Open/Closed Principle
  - Liskov Substitution Principle
  - Interface Segregation Principle
  - Dependency Inversion Principle
- Follow DRY, KISS, and YAGNI.
- Reuse existing patterns in the repository; do not introduce parallel styles.
- Keep functions/modules focused, testable, and easy to maintain.
- Validate inputs and handle errors explicitly (no silent failures).
- Do not expose sensitive data/secrets.
- Before finishing:
  1. run lint
  2. run type-check/build
  3. fix any issues introduced by the change
- If pre-existing issues exist outside touched files, call them out separately and do not worsen them.

> **PRODUCT:** LogIQ WMS — cloud-native WMS for 3PL operators and e-commerce brands. Multiple merchant clients per 3PL operator account.
>
> **TECH STACK:**
>
> - **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Zustand, TanStack Table
> - **API:** tRPC v11, Zod for all input/output validation
> - **Database:** PostgreSQL 16, Prisma ORM, pgvector extension
> - **Auth:** better-auth — email/password + Google OAuth + UPS OAuth, multi-tenant organisations, RBAC plugin, PostgreSQL adapter
> - **Billing:** Polar — subscription management, usage billing, invoicing
> - **Jobs:** BullMQ + Upstash Redis (background workers run via `server/jobs`)
> - **AI:** Anthropic Claude API (claude-sonnet-4-5), Vercel AI SDK
> - **Storage:** AWS S3 (labels, invoices, documents)
> - **Carriers:** EasyPost Node SDK
> - **Email:** Resend + React Email
> - **Webhooks:** Svix
> - **Hosting:** Vercel (frontend + API), Railway (background workers), Supabase (Postgres)
> - **Monitoring:** Sentry, Axiom, PostHog
>
> **PROJECT STRUCTURE** (standard Next.js 14 app, NOT monorepo):
>
> - `app/` — Next.js 14 App Router main application
> - `components/ui/` — shadcn/ui components (installed via CLI)
> - `components/` — Shared custom React components
> - `lib/` — Utilities, auth instance, Prisma client, helpers
> - `server/api/` — tRPC routers and context
> - `server/ai/` — LogIQ engine (Claude API + RAG)
> - `server/jobs/` — BullMQ background job processors
> - `server/integrations/` — EasyPost, Shopify, WooCommerce, BigCommerce, Etsy, TikTok Shop, eBay, QuickBooks connectors
> - `prisma/schema.prisma` — Database schema
>
> **ARCHITECTURE COMPLIANCE (mandatory — do not deviate):**
>
> - Follow **only** the stack, folder layout, module build order, tenancy model, RBAC model, and patterns defined in this document.
> - Do **not** substitute alternate frameworks or stacks (e.g. replacing tRPC with REST/GraphQL controllers, NestJS, a monorepo split, a different ORM, or a different auth library) unless this specification is formally revised.
> - Do **not** invent parallel directory trees, duplicate business logic in new layers, or bypass `accountId` scoping and role/permission middleware.
> - If something is unspecified, **extend** the smallest existing pattern (same folder, same naming, same procedure shape) — never replace the architecture wholesale.
> - Every change MUST remain consistent with `prisma/schema.prisma`, `server/api/` routers, `lib/auth.ts`, and the directory structure in Section 3.
>
> **MULTI-TENANCY MODEL:**
>
> - Account = 3PL Operator (top-level tenant)
> - Account has many Warehouses
> - Account has many Merchants (brand clients)
> - All Prisma queries MUST be scoped by `accountId`
> - All tRPC procedures MUST verify `session.user.accountId`
> - `session.user` contains: `userId`, `accountId`, `systemRole`, `managedWarehouseIds?`, `warehouseAssignments?`, `merchantId?`, `merchantPermissions?`
> - PostgreSQL Row Level Security enforced on all tables
>
> **ROLES** (6 roles across 4 tiers — stored in `AccountUser.systemRole`, injected into session):
>
> **Platform Tier**
>
> - `platform_admin` — LogIQ staff only; full access across all accounts
>
> **Operator Tier** (3PL account-scoped)
>
> - `operator_owner` — full access within their account
> - `warehouse_manager` — manages assigned warehouses: inventory, inbound, outbound, reports, staff assignment
>
> **Warehouse Tier** (per-warehouse, configurable permissions)
>
> - `warehouse_staff` — single role; permissions assigned by warehouse_manager per warehouse
>   - `warehouse:pick` → pick list access, scan picking interface
>   - `warehouse:pack` → packing station, rate shop, label print
>   - `warehouse:receive` → PO receiving, barcode scan, putaway
>   - Staff can hold any combination per warehouse (e.g. pick + pack in WH-A, receive only in WH-B)
>
> **Merchant Tier** (merchant-scoped, configurable permissions)
>
> - `merchant_owner` — full access to their merchant portal; manages their own team
> - `merchant_user` — single role; permissions assigned by merchant_owner
>   - `merchant:read` → inventory, orders, shipments, tracking
>   - `merchant:write` → create/manage orders, update settings
>   - `merchant:billing` → invoices, billing history, dispute invoices
>
> **Session fields:** `userId`, `accountId`, `systemRole`, `managedWarehouseIds?`, `warehouseAssignments?`, `merchantId?`, `merchantPermissions?`
>
> **UI DEVELOPMENT STANDARDS:**
>
> - Initialize shadcn/ui with `npx shadcn-ui@latest init` using the New York style.
> - Install components via `npx shadcn-ui@latest add <component>`.
> - Style exclusively with Tailwind CSS utility classes; use `cn()` helper for conditionals.
> - Use Tailwind config for design tokens (colours, spacing, breakpoints).
> - Every page uses shadcn/ui Card, Table, Button, Dialog, Form, Input, Select, Badge.
> - Responsive first: warehouse floor UIs (pick/pack/receive) are responsive web pages optimized for tablet/handheld scanner browsers (touch targets ≥ 44 px).
>
> **CODING STANDARDS:**
>
> - Every tRPC procedure: input Zod schema, output Zod schema, role check middleware, accountId scope enforcement
> - Every Prisma model: `id` (cuid), `createdAt`, `updatedAt`, `accountId`
> - Never expose raw database errors to the client
> - All money values stored as integers (cents), displayed as formatted
> - All timestamps stored as UTC, displayed in user's local timezone
> - Server components for data fetching, client components for interaction
>
> **CURRENT MODULE BEING BUILT:** [REPLACE WITH MODULE NAME]

## Environment Variables

| Variable                 | Used By               | Description                                |
| :----------------------- | :-------------------- | :----------------------------------------- |
| `DATABASE_URL`           | `prisma/`             | PostgreSQL connection string (Supabase)    |
| `DIRECT_URL`             | `prisma/`             | Direct URL for Prisma migrations           |
| `REDIS_URL`              | `server/jobs`         | Upstash Redis connection string            |
| `BETTER_AUTH_SECRET`     | `lib/auth.ts`         | 32-char secret for better-auth JWT signing |
| `BETTER_AUTH_URL`        | `lib/auth.ts`         | Base URL e.g. `https://app.logiqwms.io`    |
| `GOOGLE_CLIENT_ID`       | `lib/auth.ts`         | Google OAuth client ID                     |
| `GOOGLE_CLIENT_SECRET`   | `lib/auth.ts`         | Google OAuth client secret                 |
| `UPS_CLIENT_ID`          | `lib/auth.ts`         | UPS OAuth client ID                        |
| `UPS_CLIENT_SECRET`      | `lib/auth.ts`         | UPS OAuth client secret                    |
| `POLAR_ACCESS_TOKEN`     | `server/`             | Polar API access token for billing         |
| `POLAR_WEBHOOK_SECRET`   | `app/api/polar`       | Polar webhook signing secret               |
| `ANTHROPIC_API_KEY`      | `server/ai`           | Claude API key (server-side only)          |
| `EASYPOST_API_KEY`       | `server/integrations` | EasyPost production API key                |
| `EASYPOST_TEST_KEY`      | `server/integrations` | EasyPost test API key                      |
| `SHOPIFY_API_KEY`        | `server/integrations` | Shopify Partner API key                    |
| `SHOPIFY_API_SECRET`     | `server/integrations` | Shopify Partner API secret                 |
| `TIKTOK_SHOP_APP_KEY`    | `server/integrations` | TikTok Shop App API key                    |
| `TIKTOK_SHOP_APP_SECRET` | `server/integrations` | TikTok Shop App secret                     |
| `AWS_ACCESS_KEY_ID`      | `lib/s3.ts`           | S3 access key                              |
| `AWS_SECRET_ACCESS_KEY`  | `lib/s3.ts`           | S3 secret key                              |
| `AWS_S3_BUCKET`          | `lib/s3.ts`           | S3 bucket for labels and docs              |
| `RESEND_API_KEY`         | `lib/email.ts`        | Resend email API key                       |
| `SVIX_API_KEY`           | `server/integrations` | Svix outbound webhook delivery key         |
| `NEXT_PUBLIC_APP_URL`    | `app/layout`          | Public app base URL                        |
| `SENTRY_DSN`             | `lib/sentry.ts`       | Sentry error tracking DSN                  |

---

# Section 3 — Module 1: Project Scaffold & Standard Next.js App

**Build order:** FIRST. Everything else depends on this foundation.

## 3.1 Prompt

> Set up a production-grade standard Next.js 14 application for LogIQ WMS using the system context above. Scaffold the complete project structure with all folders and apps. Configure all tooling. Do not skip any step.

## 3.2 Install All Dependencies (Step 2)

**Prerequisites:** Node.js 20+ and `pnpm` (`npm install -g pnpm`).

Create the app (if not already created):

```bash
pnpm create next-app@latest logiqwms
# TypeScript: Yes · ESLint: Yes · Tailwind: Yes · src/: No · App Router: Yes · @/* alias: Yes
cd logiqwms
```

**Core packages:**

```bash
pnpm add @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query
pnpm add prisma @prisma/client
pnpm add better-auth zod zustand @tanstack/react-table
pnpm add react-hook-form @hookform/resolvers
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add recharts @anthropic-ai/sdk ai
pnpm add @polar-sh/sdk @polar-sh/nextjs
pnpm add resend @react-email/components react-email
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm add @easypost/api bullmq ioredis svix
pnpm add bwip-js pdf-lib date-fns p-limit @sentry/nextjs
pnpm add -D @types/node @types/react @types/react-dom prettier eslint-config-prettier husky lint-staged
```

**Initialize tooling:**

```bash
pnpm dlx prisma init --datasource-provider postgresql
pnpm dlx shadcn@latest init   # New York style, CSS variables: Yes
pnpm dlx shadcn@latest add button card table dialog form input select badge \
  dropdown-menu sheet tabs separator avatar skeleton toast progress \
  command popover calendar checkbox radio-group switch textarea label \
  alert accordion collapsible scroll-area tooltip
```

> Package names and shadcn CLI flags may evolve — keep versions compatible with Next.js 14 and TypeScript strict mode. Do not swap the stack defined in Section 2.

## 3.3 Full Directory & File Structure (Step 6)

Canonical layout for the **standard Next.js 14 app** (not a monorepo). Create empty files as needed; fill in per module prompts.

```
logiqwms/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── merchant/sign-in/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   ├── products/page.tsx
│   │   │   ├── products/[id]/page.tsx
│   │   │   ├── locations/page.tsx
│   │   │   ├── cycle-counts/page.tsx
│   │   │   ├── cycle-counts/[id]/page.tsx
│   │   │   └── cycle-counts/[id]/reconcile/page.tsx
│   │   ├── inbound/
│   │   │   ├── page.tsx
│   │   │   ├── suppliers/page.tsx
│   │   │   ├── purchase-orders/page.tsx
│   │   │   ├── purchase-orders/new/page.tsx
│   │   │   ├── purchase-orders/[id]/receive/page.tsx
│   │   │   └── work-orders/new/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── orders/[id]/page.tsx
│   │   ├── picking/[id]/page.tsx
│   │   ├── packing/[id]/page.tsx
│   │   ├── shipments/[id]/page.tsx
│   │   ├── returns/[id]/page.tsx
│   │   ├── merchants/page.tsx
│   │   ├── merchants/[id]/contract/page.tsx
│   │   ├── merchants/[id]/invoices/[invoiceId]/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── labels/templates/page.tsx
│   │   ├── labels/templates/new/page.tsx
│   │   ├── printing/page.tsx
│   │   ├── printing/new/page.tsx
│   │   ├── printing/[id]/page.tsx
│   │   ├── transfers/page.tsx
│   │   ├── transfers/new/page.tsx
│   │   ├── transfers/[id]/page.tsx
│   │   ├── logiq/page.tsx
│   │   └── settings/
│   │       ├── users/page.tsx
│   │       ├── users/[id]/warehouses/page.tsx
│   │       ├── warehouses/page.tsx
│   │       ├── routing/page.tsx
│   │       ├── printers/page.tsx
│   │       ├── notifications/page.tsx
│   │       ├── billing/page.tsx
│   │       └── billing/upgrade/page.tsx
│   ├── (portal)/
│   │   ├── layout.tsx
│   │   └── portal/
│   │       ├── dashboard/page.tsx
│   │       ├── billing/page.tsx
│   │       ├── chat/page.tsx
│   │       ├── team/page.tsx
│   │       ├── settings/page.tsx
│   │       ├── settings/integrations/page.tsx
│   │       └── settings/integrations/[platform]/connect/page.tsx
│   ├── api/
│   │   ├── trpc/[trpc]/route.ts
│   │   ├── auth/[...all]/route.ts
│   │   ├── polar/route.ts
│   │   └── webhooks/
│   │       ├── easypost/route.ts
│   │       ├── shopify/route.ts
│   │       ├── bigcommerce/route.ts
│   │       ├── woocommerce/route.ts
│   │       ├── etsy/route.ts
│   │       ├── tiktok-shop/route.ts
│   │       └── ebay/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   └── shared/
│       ├── sidebar.tsx
│       ├── header.tsx
│       ├── notification-bell.tsx
│       ├── notification-drawer.tsx
│       ├── data-table.tsx
│       ├── stat-card.tsx
│       ├── page-header.tsx
│       └── empty-state.tsx
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   ├── db.ts
│   ├── email.ts
│   ├── s3.ts
│   ├── utils.ts
│   └── sentry.ts
├── server/
│   ├── api/
│   │   ├── trpc.ts
│   │   ├── root.ts
│   │   └── routers/
│   │       ├── auth.ts
│   │       ├── warehouse-staff.ts
│   │       ├── merchant-user.ts
│   │       ├── product.ts
│   │       ├── stock-level.ts
│   │       ├── cycle-count.ts
│   │       ├── supplier.ts
│   │       ├── purchase-order.ts
│   │       ├── work-order.ts
│   │       ├── order.ts
│   │       ├── pick-list.ts
│   │       ├── shipment.ts
│   │       ├── merchant.ts
│   │       ├── invoice.ts
│   │       ├── analytics.ts
│   │       ├── integration.ts
│   │       ├── notification.ts
│   │       ├── label.ts
│   │       ├── packaging.ts
│   │       ├── print-queue.ts
│   │       ├── routing.ts
│   │       ├── transfer.ts
│   │       ├── billing.ts
│   │       └── logiq.ts
│   ├── ai/
│   │   ├── client.ts
│   │   ├── query-engine.ts
│   │   └── prompts/
│   │       ├── query.ts
│   │       ├── billing-anomaly.ts
│   │       └── merchant-chat.ts
│   ├── jobs/
│   │   ├── queues.ts
│   │   └── workers/
│   │       ├── notify.worker.ts
│   │       ├── integration-sync.worker.ts
│   │       ├── logiq.worker.ts
│   │       └── index.ts
│   └── integrations/
│       ├── normaliser.ts
│       ├── shopify.ts
│       ├── woocommerce.ts
│       ├── bigcommerce.ts
│       ├── etsy.ts
│       ├── tiktok-shop.ts
│       ├── ebay.ts
│       ├── easypost.ts
│       └── quickbooks.ts
├── prisma/
│   └── schema.prisma
├── public/
├── styles/
│   └── globals.css
├── middleware.ts
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
├── .env
├── .env.example
└── package.json
```

> **Note:** Nested routes under `inventory/`, `inbound/`, `settings/`, and `portal/` must follow the paths above so module prompts, middleware, and RBAC guards stay aligned.

## 3.4 tRPC Base Setup

```typescript
// server/api/trpc.ts

import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth"; // better-auth instance
import { db } from "@/lib/db";
import { ZodError } from "zod";

type WarehouseAssignment = { warehouseId: string; permissions: string[] };

export const createTRPCContext = async (opts: { req: Request }) => {
  const session = await auth.api.getSession({ headers: opts.req.headers });
  const warehouseAssignments: WarehouseAssignment[] = session?.user
    ?.warehouseAssignments
    ? JSON.parse(session.user.warehouseAssignments as string)
    : [];

  return {
    db,
    userId: session?.user?.id ?? null,
    accountId: session?.user?.accountId ?? null,
    systemRole: session?.user?.systemRole ?? null,
    managedWarehouseIds: (session?.user?.managedWarehouseIds ?? []) as string[],
    warehouseAssignments,
    merchantId: session?.user?.merchantId ?? null,
    merchantPermissions: (session?.user?.merchantPermissions ?? []) as string[],
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.accountId)
    throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      accountId: ctx.accountId,
    },
  });
});

// Operator-level role gate (platform_admin always passes)
export const requireRole = (...roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    if (
      ctx.systemRole !== "platform_admin" &&
      !roles.includes(ctx.systemRole ?? "")
    )
      throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx });
  });

// Warehouse staff permission gate — checks WarehouseStaffAssignment for the target warehouse
export const requireWarehousePermission = (
  warehouseId: string,
  ...perms: ("PICK" | "PACK" | "RECEIVE")[]
) =>
  t.middleware(({ ctx, next }) => {
    const { systemRole, managedWarehouseIds, warehouseAssignments } = ctx;

    // platform_admin and operator_owner always pass
    if (systemRole === "platform_admin" || systemRole === "OPERATOR_OWNER")
      return next({ ctx });

    // warehouse_manager passes for their assigned warehouses
    if (
      systemRole === "WAREHOUSE_MANAGER" &&
      managedWarehouseIds.includes(warehouseId)
    )
      return next({ ctx });

    // warehouse_staff: check specific permissions in the specific warehouse
    if (systemRole === "WAREHOUSE_STAFF") {
      const assignment = warehouseAssignments.find(
        (a) => a.warehouseId === warehouseId,
      );
      const hasAll = perms.every((p) => assignment?.permissions.includes(p));
      if (hasAll) return next({ ctx });
    }

    throw new TRPCError({ code: "FORBIDDEN" });
  });

// Merchant permission gate — checks MerchantUser.permissions for merchant_user
export const requireMerchantPermission = (
  ...perms: ("READ" | "WRITE" | "BILLING")[]
) =>
  t.middleware(({ ctx, next }) => {
    const { systemRole, merchantPermissions } = ctx;

    if (systemRole === "platform_admin" || systemRole === "OPERATOR_OWNER")
      return next({ ctx });

    // merchant_owner implicitly has all permissions
    if (systemRole === "MERCHANT_OWNER") return next({ ctx });

    // merchant_user: check assigned permissions
    if (systemRole === "MERCHANT_USER") {
      const hasAll = perms.every((p) => merchantPermissions.includes(p));
      if (hasAll) return next({ ctx });
    }

    throw new TRPCError({ code: "FORBIDDEN" });
  });

export const router = t.router;
export const publicProc = t.procedure;
export const protectedProc = t.procedure.use(enforceAuth);
```

---

# Section 4 — Module 2: Authentication & Multi-Tenancy (better-auth)

**Build order:** SECOND. Every module's tRPC procedures depend on the tenant context established here.

## 4.1 Why better-auth

| Feature                    | better-auth Support                                  |
| :------------------------- | :--------------------------------------------------- |
| Email & password auth      | Built-in, with email verification flow               |
| Google OAuth               | Built-in OAuth plugin                                |
| UPS OAuth                  | Built-in OAuth plugin (custom provider)              |
| Multi-tenant organisations | Built-in Organization plugin — maps 1:1 to Account   |
| RBAC                       | Built-in RBAC plugin — role stored in session and DB |
| PostgreSQL adapter         | Official Prisma adapter — models auto-created        |
| Session strategy           | JWT (stateless) or database sessions — use JWT       |
| Magic link / email OTP     | Built-in for passwordless merchant invite flow       |
| Framework                  | Next.js App Router first-class support               |

## 4.2 better-auth Configuration

```typescript
// lib/auth.ts

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins/organization";
import { rbac } from "better-auth/plugins/rbac";
import { magicLink } from "better-auth/plugins/magic-link";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    ups: {
      clientId: process.env.UPS_CLIENT_ID!,
      clientSecret: process.env.UPS_CLIENT_SECRET!,
      authorization: {
        url: "https://www.ups.com/lasso/signin",
        params: { scope: "read" },
      },
      token: "https://www.ups.com/security/v1/oauth/token",
      userInfo: "https://onlinetools.ups.com/api/track/v1/details",
    },
  },
  plugins: [
    organization({
      // Every 3PL operator creates an Organisation = Account
      allowUserToCreateOrganization: true,
      membershipRequiresApproval: false,
    }),
    rbac({
      // Roles are fixed — permissions within warehouse_staff and merchant_user
      // are configurable and stored in DB, not hardcoded here.
      roles: {
        platform_admin: { permissions: ["*"] },
        operator_owner: { permissions: ["*"] },
        warehouse_manager: {
          permissions: [
            "inventory",
            "inbound",
            "outbound",
            "reports",
            "staff:manage",
          ],
        },
        warehouse_staff: { permissions: [] }, // actual permissions stored in WarehouseStaffAssignment
        merchant_owner: {
          permissions: ["merchant:read", "merchant:write", "merchant:billing"],
        },
        merchant_user: { permissions: [] }, // actual permissions stored in MerchantUser.permissions
      },
    }),
    magicLink({
      // Used for merchant invite emails
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          to: email,
          subject: "Your LogIQ WMS invitation",
          react: MerchantInviteEmail({ url }),
        });
      },
    }),
  ],
  // Extend session to carry all RBAC context
  session: {
    additionalFields: {
      accountId: { type: "string", required: false },
      systemRole: { type: "string", required: false },
      // warehouse_manager: warehouses they manage
      managedWarehouseIds: { type: "string[]", required: false },
      // warehouse_staff: per-warehouse permission assignments
      // shape: [{ warehouseId: string, permissions: ('PICK'|'PACK'|'RECEIVE')[] }]
      warehouseAssignments: { type: "string", required: false }, // JSON-serialised
      // merchant roles
      merchantId: { type: "string", required: false },
      // merchant_user: permissions granted by merchant_owner
      merchantPermissions: { type: "string[]", required: false }, // ['READ','WRITE','BILLING']
    },
  },
});
```

## 4.3 Prisma Schema — Auth & Tenancy

```prisma
// better-auth auto-generates: user, session, account, verification tables
// We extend with our domain models:

model Account {
  id              String        @id @default(cuid())
  betterAuthOrgId String        @unique // better-auth Organisation.id
  name            String
  slug            String        @unique
  plan            Plan          @default(STARTER)
  polarCustomerId String?       // Polar billing customer ID
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  warehouses      Warehouse[]
  merchants       Merchant[]
  users           AccountUser[]
}

model AccountUser {
  id                  String                     @id @default(cuid())
  accountId           String
  betterAuthUserId    String                     @unique // better-auth user.id
  systemRole          SystemRole
  email               String
  firstName           String?
  lastName            String?
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt
  account             Account                    @relation(fields: [accountId], references: [id])
  warehouseAssignments WarehouseStaffAssignment[] // populated for warehouse_staff
  managedWarehouses   WarehouseManager[]          // populated for warehouse_manager

  @@index([accountId])
}

// Operator-side staff assigned to a warehouse with configurable permissions.
// warehouse_manager assigns any combination of PICK, PACK, RECEIVE per warehouse.
// One record per staff member per warehouse — permissions field is the variable.
model WarehouseStaffAssignment {
  id          String                @id @default(cuid())
  accountId   String
  userId      String                // AccountUser.id (must have systemRole = WAREHOUSE_STAFF)
  warehouseId String
  permissions WarehousePermission[] // [PICK], [PACK, RECEIVE], [PICK, PACK, RECEIVE], etc.
  assignedBy  String                // AccountUser.id of the warehouse_manager
  assignedAt  DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  user        AccountUser           @relation(fields: [userId], references: [id])
  warehouse   Warehouse             @relation(fields: [warehouseId], references: [id])

  @@unique([userId, warehouseId])
  @@index([accountId, warehouseId])
}

// Tracks which warehouses a warehouse_manager is responsible for.
model WarehouseManager {
  id          String      @id @default(cuid())
  accountId   String
  userId      String      // AccountUser.id (must have systemRole = WAREHOUSE_MANAGER)
  warehouseId String
  assignedBy  String      // AccountUser.id of the operator_owner
  assignedAt  DateTime    @default(now())
  user        AccountUser @relation(fields: [userId], references: [id])
  warehouse   Warehouse   @relation(fields: [warehouseId], references: [id])

  @@unique([userId, warehouseId])
  @@index([accountId, warehouseId])
}

enum Plan { STARTER GROWTH ENTERPRISE }

enum SystemRole {
  PLATFORM_ADMIN
  OPERATOR_OWNER
  WAREHOUSE_MANAGER
  WAREHOUSE_STAFF
  MERCHANT_OWNER
  MERCHANT_USER
}

enum WarehousePermission {
  PICK
  PACK
  RECEIVE
}

enum MerchantPermission {
  READ
  WRITE
  BILLING
}

model Warehouse {
  id           String    @id @default(cuid())
  accountId    String
  name         String
  code         String
  addressLine1 String
  city         String
  state        String
  zip          String
  country      String    @default('US')
  timezone     String    @default('America/Los_Angeles')
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  account      Account   @relation(fields: [accountId], references: [id])
  zones        Zone[]

  @@index([accountId])
}
```

## 4.4 Business Logic Rules

| Rule                          | Detail                                                                                                                                                                                                                                                                                                                                                                                                             |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Org = Account                 | On better-auth `organisation.created` webhook: create `Account` row with `betterAuthOrgId`. On `member.created`: create `AccountUser` with mapped `systemRole`.                                                                                                                                                                                                                                                    |
| Session extension             | better-auth `afterLogin` hook: look up `AccountUser` by `betterAuthUserId`. Inject into session: `accountId`, `systemRole`. For `WAREHOUSE_MANAGER`: query `WarehouseManager` and inject `managedWarehouseIds[]`. For `WAREHOUSE_STAFF`: query `WarehouseStaffAssignment` and inject `warehouseAssignments[]` (JSON). For merchant roles: look up `MerchantUser`, inject `merchantId` and `merchantPermissions[]`. |
| Merchant invite (first owner) | Operator calls `merchant.create` — creates `Merchant` row + `MerchantUser` with `systemRole=MERCHANT_OWNER`. System calls `auth.api.sendMagicLink`. Merchant clicks link, better-auth account created, role auto-set.                                                                                                                                                                                              |
| Merchant user invite          | `merchant_owner` calls `merchantUser.invite` — creates `MerchantUser` with `systemRole=MERCHANT_USER` and chosen `permissions[]`. System sends magic link.                                                                                                                                                                                                                                                         |
| Merchant permission update    | `merchant_owner` calls `merchantUser.update` — updates `MerchantUser.permissions[]`. Session is invalidated so the user's next request picks up the new permissions.                                                                                                                                                                                                                                               |
| Staff assignment              | `warehouse_manager` (or `operator_owner`) calls `warehouseStaff.assign` — creates `WarehouseStaffAssignment` with chosen `permissions[]`. Staff member must have `systemRole=WAREHOUSE_STAFF`.                                                                                                                                                                                                                     |
| Staff permission update       | `warehouse_manager` calls `warehouseStaff.update` — updates `WarehouseStaffAssignment.permissions[]`. Session invalidated.                                                                                                                                                                                                                                                                                         |
| Warehouse manager scope       | Every inbound/outbound/inventory tRPC procedure for `WAREHOUSE_MANAGER` checks `WarehouseManager` table to confirm they manage the target `warehouseId`.                                                                                                                                                                                                                                                           |
| Staff warehouse scope         | Every pick/pack/receive tRPC procedure checks `WarehouseStaffAssignment` to confirm the staff member has the required permission in the target warehouse.                                                                                                                                                                                                                                                          |
| platform_admin access         | `platform_admin` bypasses all `accountId` scoping checks. Used only for LogIQ support tooling — never exposed to regular users.                                                                                                                                                                                                                                                                                    |
| Tenant isolation              | Every DB query includes `accountId` in WHERE. `betterAuthOrgId` is source of truth — never trust client-supplied `accountId`.                                                                                                                                                                                                                                                                                      |

## 4.5 Required Pages

| Route                             | Access             | Description                                                                                                                   |
| :-------------------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `/sign-in`                        | Public             | Email/password + Google OAuth + UPS OAuth sign-in                                                                             |
| `/sign-up`                        | Public             | 3PL operator registration — creates user + organisation + Account row                                                         |
| `/onboarding`                     | `operator_owner`   | 3-step wizard: account details → first warehouse → invite team                                                                |
| `/dashboard`                      | All operator roles | App shell: sidebar nav, user menu, org switcher                                                                               |
| `/settings/users`                 | `operator_owner`   | Invite operators, assign `warehouse_manager` or `warehouse_staff` systemRole, revoke access                                   |
| `/settings/users/[id]/warehouses` | `operator_owner`   | Assign warehouse_manager to warehouses; assign warehouse_staff to warehouses + set permissions (PICK/PACK/RECEIVE checkboxes) |
| `/settings/warehouses`            | `operator_owner`   | CRUD warehouses, timezone, activate/deactivate                                                                                |
| `/merchant/sign-in`               | Public             | Magic-link sign-in for merchant users                                                                                         |
| `/portal/team`                    | `merchant_owner`   | Invite merchant_users, set permissions (READ/WRITE/BILLING checkboxes), revoke access                                         |

---

# Section 5 — Module 3: Inventory Management

**Build order:** THIRD. Core data layer — all other modules write to and read from these models.

## 5.1 Prompt

> Build the complete Inventory Management module for LogIQ WMS.
>
> Prisma models, tRPC procedures, business logic, React UI pages.
>
> Cover: products, SKUs, variants, warehouse zones and bins, real-time stock levels, stock movement audit trail, multi-merchant isolation, lot/serial tracking, dead stock detection, low stock alerts, and the full Cycle Count workflow.
>
> UI built with shadcn/ui Table, Card, Dialog, Form, Input, Button, Badge. Use Tailwind CSS for all layout and spacing. Responsive grid for warehouse floor interfaces.

## 5.2 Prisma Schema

```prisma
model Merchant {
  id        String         @id @default(cuid())
  accountId String
  name      String
  email     String
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  account   Account        @relation(fields: [accountId], references: [id])
  products  Product[]
  orders    Order[]
  invoices  Invoice[]
  users     MerchantUser[]

  @@index([accountId])
}

// Merchant portal users. Two roles: merchant_owner (hardcoded full access)
// and merchant_user (permissions assigned by the owner at invite time).
model MerchantUser {
  id               String               @id @default(cuid())
  accountId        String
  merchantId       String
  betterAuthUserId String               @unique // better-auth user.id
  systemRole       SystemRole           // MERCHANT_OWNER or MERCHANT_USER
  permissions      MerchantPermission[] // empty for MERCHANT_OWNER (has all implicitly)
  email            String
  firstName        String?
  lastName         String?
  invitedBy        String               // AccountUser.id or MerchantUser.id of the inviter
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  merchant         Merchant             @relation(fields: [merchantId], references: [id])

  @@index([accountId, merchantId])
}

model Zone {
  id          String    @id @default(cuid())
  warehouseId String
  name        String
  code        String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  bins        Bin[]

  @@index([warehouseId])
}

model Bin {
  id          String       @id @default(cuid())
  zoneId      String
  warehouseId String
  label       String       // e.g. A-04-12-03
  aisle       String
  rack        String
  level       String
  position    String
  maxWeight   Float?
  isActive    Boolean      @default(true)
  zone        Zone         @relation(fields: [zoneId], references: [id])
  stockLevels StockLevel[]

  @@index([warehouseId])
}

model Product {
  id                String          @id @default(cuid())
  accountId         String
  merchantId        String
  name              String
  sku               String
  barcode           String?
  weightOz          Float?
  lengthIn          Float?
  widthIn           Float?
  heightIn          Float?
  lotTracking       Boolean         @default(false)
  serialTracking    Boolean         @default(false)
  expiryTracking    Boolean         @default(false)
  lowStockThreshold Int?
  deadStockDays     Int             @default(90)
  isActive          Boolean         @default(true)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  merchant          Merchant        @relation(fields: [merchantId], references: [id])
  stockLevels       StockLevel[]
  movements         StockMovement[]

  @@unique([accountId, merchantId, sku])
  @@index([accountId, merchantId])
}

model StockLevel {
  id           String    @id @default(cuid())
  accountId    String
  productId    String
  binId        String
  warehouseId  String
  quantity     Int       @default(0)
  reservedQty  Int       @default(0)
  lotNumber    String?
  serialNumber String?
  expiryDate   DateTime?
  updatedAt    DateTime  @updatedAt
  product      Product   @relation(fields: [productId], references: [id])
  bin          Bin       @relation(fields: [binId], references: [id])

  @@unique([productId, binId, lotNumber, serialNumber])
  @@index([accountId, warehouseId])
}

model StockMovement {
  id             String       @id @default(cuid())
  accountId      String
  productId      String
  warehouseId    String
  binId          String?
  type           MovementType
  quantityDelta  Int
  quantityBefore Int
  quantityAfter  Int
  referenceId    String?
  referenceType  String?
  lotNumber      String?
  reason         String?
  performedBy    String
  createdAt      DateTime     @default(now())
  product        Product      @relation(fields: [productId], references: [id])

  @@index([accountId, productId])
}

enum MovementType {
  INBOUND
  OUTBOUND
  TRANSFER
  ADJUSTMENT
  CYCLE_COUNT_ADJUSTMENT
  RETURN_RESTOCK
  RETURN_DISPOSE
  WORK_ORDER_CONSUME
  WORK_ORDER_PRODUCE
}

model CycleCount {
  id            String         @id @default(cuid())
  accountId     String
  warehouseId   String
  name          String
  status        CycleStatus    @default(DRAFT)
  scheduledDate DateTime?
  completedAt   DateTime?
  createdBy     String
  createdAt     DateTime       @default(now())
  lines         CycleCountLine[]
}

model CycleCountLine {
  id           String     @id @default(cuid())
  cycleCountId String
  productId    String
  binId        String
  expectedQty  Int
  countedQty   Int?
  discrepancy  Int?
  reconciled   Boolean    @default(false)
  cycleCount   CycleCount @relation(fields: [cycleCountId], references: [id])
}

enum CycleStatus { DRAFT ACTIVE COMPLETED RECONCILED }
```

## 5.3 tRPC Procedures

| Procedure                 | Input                                                                           | Notes                                           |
| :------------------------ | :------------------------------------------------------------------------------ | :---------------------------------------------- |
| `product.create`          | merchantId, name, sku, barcode, weight, dims, tracking flags, lowStockThreshold | Scoped to accountId                             |
| `product.update`          | productId + partial fields                                                      | Soft update — never delete                      |
| `product.list`            | merchantId, search?, page, limit                                                | Returns total stock per SKU                     |
| `product.getById`         | productId                                                                       | With all StockLevels + recent movements         |
| `stockLevel.getByProduct` | productId, warehouseId?                                                         | Returns bin details                             |
| `stockLevel.adjust`       | productId, binId, delta, reason                                                 | Atomic: move + audit log                        |
| `stockLevel.transfer`     | productId, fromBinId, toBinId, qty                                              | 2x StockMovement records                        |
| `cycleCount.create`       | warehouseId, name, binIds[], scheduledDate?                                     | Pre-populates lines from StockLevels            |
| `cycleCount.submitScan`   | cycleCountLineId, countedQty                                                    | Used by floor staff on responsive web UI        |
| `cycleCount.reconcile`    | cycleCountId                                                                    | Applies discrepancies as CYCLE_COUNT_ADJUSTMENT |
| `alerts.getLowStock`      | warehouseId?                                                                    | Products below lowStockThreshold                |
| `alerts.getDeadStock`     | warehouseId?, dayThreshold?                                                     | Zero movement for N days                        |

## 5.4 Business Logic Rules

| Rule                 | Detail                                                                                                                       |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| availableQty         | Always computed: `quantity - reservedQty`. Never stored in DB.                                                               |
| Atomic movements     | Every StockLevel change MUST create a StockMovement in the same Prisma transaction.                                          |
| Negative stock guard | Throw `PRECONDITION_FAILED` if adjustment would make `quantity < 0`. Exception: ADJUSTMENT type with explicit override flag. |
| Lot enforcement      | If `product.lotTracking=true`, `lotNumber` MUST be provided on every INBOUND movement.                                       |
| Dead stock query     | `StockLevel.quantity > 0` AND most recent `StockMovement.createdAt` older than `deadStockDays`.                              |
| Low stock alert      | Triggered when `availableQty` drops below `lowStockThreshold`. Push to BullMQ alert queue.                                   |
| Tenant isolation     | Every query includes `accountId` in WHERE. Never trust client-supplied IDs.                                                  |

## 5.5 UI Pages

| Route                                    | Description                                                                                |
| :--------------------------------------- | :----------------------------------------------------------------------------------------- |
| `/inventory`                             | Dashboard: SKUs, units, low stock count, dead stock count, movements feed                  |
| `/inventory/products`                    | TanStack Table: searchable, filterable, inline stock level per warehouse                   |
| `/inventory/products/[id]`               | Stock by bin/zone chart, movement history timeline, edit panel                             |
| `/inventory/locations`                   | Visual warehouse grid: zones → bins with current contents                                  |
| `/inventory/cycle-counts`                | List all cycle counts with status badges                                                   |
| `/inventory/cycle-counts/[id]`           | Responsive scan interface for floor staff (optimized for tablet/handheld scanner browsers) |
| `/inventory/cycle-counts/[id]/reconcile` | Discrepancy review — accept or override, apply adjustments                                 |

---

# Section 6 — Module 4: Inbound — Purchase Orders & Receiving

**Build order:** FOURTH. Depends on Inventory. Writes to StockLevel and StockMovement.

## 6.1 Prompt

> Build the complete Inbound module for LogIQ WMS.
>
> Supplier management, Purchase Orders (create/send/track), ASN support, receiving workflow (scan on arrival, match to PO, putaway suggestions), and Work Orders (kitting and assembly).
>
> All Prisma models, tRPC procedures, business logic, and UI.
>
> UI built with shadcn/ui components and Tailwind CSS. Receiving scan interface is a responsive web page for tablet/handheld browsers.

## 6.2 Prisma Schema

```prisma
model Supplier {
  id             String          @id @default(cuid())
  accountId      String
  name           String
  email          String?
  leadTimeDays   Int             @default(7)
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  purchaseOrders PurchaseOrder[]

  @@index([accountId])
}

model PurchaseOrder {
  id               String            @id @default(cuid())
  accountId        String
  merchantId       String
  warehouseId      String
  supplierId       String
  poNumber         String            // PO-{year}-{seq}
  status           POStatus          @default(DRAFT)
  expectedDate     DateTime?
  receivedAt       DateTime?
  notes            String?
  createdBy        String
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  supplier         Supplier          @relation(fields: [supplierId], references: [id])
  lines            PurchaseOrderLine[]
  receivingRecords ReceivingRecord[]

  @@index([accountId, merchantId])
}

enum POStatus {
  DRAFT
  SENT
  CONFIRMED
  IN_TRANSIT
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

model PurchaseOrderLine {
  id            String        @id @default(cuid())
  poId          String
  productId     String
  orderedQty    Int
  receivedQty   Int           @default(0)
  unitCostCents Int?
  lotNumber     String?
  expiryDate    DateTime?
  po            PurchaseOrder @relation(fields: [poId], references: [id])

  @@index([poId])
}

model ReceivingRecord {
  id              String        @id @default(cuid())
  accountId       String
  poId            String
  productId       String
  receivedQty     Int
  putawayBinId    String?
  receivedBy      String
  discrepancyNote String?
  createdAt       DateTime      @default(now())
  po              PurchaseOrder @relation(fields: [poId], references: [id])

  @@index([accountId, poId])
}

model WorkOrder {
  id              String          @id @default(cuid())
  accountId       String
  merchantId      String
  warehouseId     String
  woNumber        String          // WO-{year}-{seq}
  type            WorkOrderType
  status          WorkOrderStatus @default(PENDING)
  targetQty       Int
  completedQty    Int             @default(0)
  outputProductId String?
  outputBinId     String?
  scheduledDate   DateTime?
  completedAt     DateTime?
  createdBy       String
  createdAt       DateTime        @default(now())
  inputLines      WorkOrderInput[]

  @@index([accountId, merchantId])
}

model WorkOrderInput {
  id          String    @id @default(cuid())
  workOrderId String
  productId   String
  qtyPerUnit  Int
  consumedQty Int       @default(0)
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id])
}

enum WorkOrderType { KITTING ASSEMBLY BUNDLING REPACKAGING }
enum WorkOrderStatus { PENDING IN_PROGRESS COMPLETED CANCELLED }
```

## 6.3 Key Business Rules

| Rule                   | Detail                                                                                                                                         |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| PO number generation   | `PO-{YYYY}-{zero-padded seq per account}`. Use `$queryRaw` to get next sequence atomically.                                                    |
| Receiving atomicity    | `po.receive.scan`: atomically create ReceivingRecord + StockMovement (INBOUND) + increment StockLevel.quantity + increment POLine.receivedQty. |
| Putaway suggestion     | Query bins sorted by: same product already stored → most available capacity → alphabetical. Return top 3.                                      |
| Over-receiving guard   | `scannedQty + POLine.receivedQty > POLine.orderedQty × 1.1` → throw `PRECONDITION_FAILED` with override option.                                |
| Work Order reservation | On start: increment `StockLevel.reservedQty` for each input. Fail atomically if any line has insufficient `availableQty`.                      |
| Work Order completion  | Atomic: `WORK_ORDER_CONSUME` inputs, `WORK_ORDER_PRODUCE` output to outputBinId.                                                               |

## 6.4 UI Pages

| Route                                   | Description                                                                                  |
| :-------------------------------------- | :------------------------------------------------------------------------------------------- |
| `/inbound`                              | Dashboard: open POs, expected this week, work orders pending                                 |
| `/inbound/suppliers`                    | Supplier list with on-time rate, create/edit drawer                                          |
| `/inbound/purchase-orders`              | PO list filtered by status, merchant, supplier                                               |
| `/inbound/purchase-orders/new`          | PO wizard: supplier → lines → expected date → send                                           |
| `/inbound/purchase-orders/[id]/receive` | Responsive scan UI: barcode input, line matching, putaway selector (tablet/handheld browser) |
| `/inbound/work-orders/new`              | Work order: type, output product, input components with qty-per-unit                         |

---

# Section 7 — Module 5: Outbound — Pick, Pack & Ship

**Build order:** FIFTH. Highest-frequency daily-use module.

## 7.1 Prompt

> Build the complete Outbound module for LogIQ WMS.
>
> Order ingestion, routing rules, pick list strategies (single/batch/zone/wave), responsive web-based pick & pack with barcode scanning (optimized for tablet/handheld scanner browsers), packing station UI, EasyPost Rate Shop, label generation, tracking webhook processing, and Returns/RMA workflow. All models, procedures, logic, UI.
>
> UI built with shadcn/ui and Tailwind CSS. Pick/Pack pages use large touch targets (min 44 px) and responsive layouts for warehouse floor tablets.

## 7.2 Prisma Schema

```prisma
model Order {
  id                String            @id @default(cuid())
  accountId         String
  merchantId        String
  warehouseId       String?
  channelOrderId    String
  channel           String
  status            OrderStatus       @default(PENDING)
  fulfillmentStatus FulfillmentStatus @default(UNFULFILLED)
  shippingName      String
  shippingLine1     String
  shippingCity      String
  shippingState     String
  shippingZip       String
  shippingCountry   String            @default('US')
  slaHours          Int?
  dueAt             DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  lines             OrderLine[]
  shipments         Shipment[]
  pickList          PickList?

  @@unique([accountId, channelOrderId, channel])
  @@index([accountId, merchantId, status])
}

enum OrderStatus { PENDING ON_HOLD CANCELLED }
enum FulfillmentStatus { UNFULFILLED PARTIALLY_FULFILLED FULFILLED }

model OrderLine {
  id        String @id @default(cuid())
  orderId   String
  productId String
  sku       String
  quantity  Int
  pickedQty Int    @default(0)
  order     Order  @relation(fields: [orderId], references: [id])

  @@index([orderId])
}

model PickList {
  id          String       @id @default(cuid())
  accountId   String
  warehouseId String
  strategy    PickStrategy
  status      PickStatus   @default(PENDING)
  assignedTo  String?
  startedAt   DateTime?
  completedAt DateTime?
  orderId     String?      @unique
  order       Order?       @relation(fields: [orderId], references: [id])
  items       PickListItem[]

  @@index([accountId, warehouseId, status])
}

model PickListItem {
  id          String   @id @default(cuid())
  pickListId  String
  productId   String
  orderId     String
  binId       String
  binLabel    String
  requiredQty Int
  pickedQty   Int      @default(0)
  scannedAt   DateTime?
  pickList    PickList @relation(fields: [pickListId], references: [id])

  @@index([pickListId])
}

enum PickStrategy { SINGLE BATCH ZONE WAVE }
enum PickStatus { PENDING IN_PROGRESS COMPLETED }

model Shipment {
  id                 String         @id @default(cuid())
  accountId          String
  orderId            String
  easypostShipmentId String?        @unique
  carrier            String
  service            String
  trackingNumber     String?
  labelUrl           String?
  weightOz           Float?
  rateCents          Int?
  status             ShipmentStatus @default(LABEL_CREATED)
  shippedAt          DateTime?
  deliveredAt        DateTime?
  logiqRecommended   Boolean        @default(false)
  createdAt          DateTime       @default(now())
  order              Order          @relation(fields: [orderId], references: [id])
  trackingEvents     TrackingEvent[]

  @@index([accountId, orderId])
}

enum ShipmentStatus {
  LABEL_CREATED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  EXCEPTION
  RETURNED
  VOIDED
}

model CarrierPerformanceLog {
  id              String   @id @default(cuid())
  accountId       String
  shipmentId      String   @unique
  carrier         String
  service         String
  destinationZone Int?
  weightOz        Float
  promisedDays    Int?
  actualDays      Int?
  onTime          Boolean?
  damaged         Boolean  @default(false)
  rateCents       Int
  createdAt       DateTime @default(now())

  @@index([accountId, carrier])
}
```

## 7.3 Key Business Rules

| Rule                  | Detail                                                                                                                                          |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| Stock reservation     | On order assign: for each OrderLine find best StockLevel (FEFO if expiry, else FIFO), increment `reservedQty`. Fail atomically if insufficient. |
| Pick bin optimisation | SQL: bins containing product sorted by expiry ASC (FEFO), then quantity DESC.                                                                   |
| Barcode validation    | On `pickList.scan`: verify scannedBarcode matches `Product.barcode`. Reject mismatches. `OPERATOR_ADMIN` can override with audit note.          |
| Rate shop             | EasyPost `Shipment.create` with all carrier accounts. Tag cheapest, fastest, LogIQ recommended.                                                 |
| Label S3 storage      | Download EasyPost label PDF, upload to S3 at `{accountId}/labels/{shipmentId}.pdf`. Return presigned URL.                                       |
| Carrier perf logging  | On `DELIVERED` tracking event: compute actualDays, create CarrierPerformanceLog. Used by LogIQ engine.                                          |

## 7.4 UI Pages

| Route             | Description                                                                                 |
| :---------------- | :------------------------------------------------------------------------------------------ |
| `/orders`         | Tabbed: Unfulfilled / Due Today / All. Bulk assign/hold.                                    |
| `/orders/[id]`    | Line items, pick status, label download, tracking timeline                                  |
| `/picking/[id]`   | Responsive web scan UI: large tap targets, bin label, qty confirm (tablet/handheld browser) |
| `/packing/[id]`   | Weight/dims, rate shop table, buy label button, print                                       |
| `/shipments/[id]` | Full tracking event timeline                                                                |
| `/returns/[id]`   | Condition selector per line, disposition decision                                           |

---

# Section 8 — Module 6: MerchantOS — Merchant Portal

**Build order:** SIXTH. Adds merchant-facing views and billing engine.

## 8.1 Prompt

> Build the complete MerchantOS module for LogIQ WMS.
>
> Merchant onboarding, marketplace integrations (Shopify, WooCommerce, BigCommerce, Etsy, TikTok Shop, eBay), merchant dashboard, fulfillment delegation, billing and invoicing engine with configurable fee rules per contract, invoice generation and approval workflow, SLA tracking with breach alerts.
>
> Each merchant connects their own store credentials via LogIQ's single registered app per platform (single connector model). Merchants manage all their integrations from the merchant portal settings page.
>
> UI built with shadcn/ui and Tailwind CSS.

## 8.2 Prisma Schema — Billing

```prisma
model MerchantContract {
  id            String        @id @default(cuid())
  accountId     String
  merchantId    String        @unique
  paymentPeriod PaymentPeriod @default(MONTHLY)
  currency      String        @default('USD')
  startDate     DateTime
  isActive      Boolean       @default(true)
  feeRules      FeeRule[]
  slaRules      SLARule[]
  invoices      Invoice[]
}

enum PaymentPeriod { WEEKLY BIWEEKLY MONTHLY }

model FeeRule {
  id            String           @id @default(cuid())
  contractId    String
  feeType       FeeType
  rateCents     Int
  unitLabel     String
  includedUnits Int              @default(0)
  contract      MerchantContract @relation(fields: [contractId], references: [id])
}

enum FeeType {
  STORAGE_PER_UNIT_DAY
  STORAGE_PER_PALLET_DAY
  PICK_INITIAL
  PICK_ADDITIONAL
  RECEIVING_PER_PO
  RECEIVING_PER_UNIT
  PACKING_PER_SHIPMENT
  LABEL_PER_SHIPMENT
  RETURN_PROCESSING
  SPECIAL_HANDLING
}

model Invoice {
  id            String        @id @default(cuid())
  accountId     String
  merchantId    String
  contractId    String
  invoiceNumber String        // INV-{year}-{seq}
  periodStart   DateTime
  periodEnd     DateTime
  status        InvoiceStatus @default(DRAFT)
  totalCents    Int           @default(0)
  anomalyFlags  Json?
  pdfUrl        String?
  createdAt     DateTime      @default(now())
  lines         InvoiceLine[]

  @@index([accountId, merchantId])
}

model InvoiceLine {
  id            String  @id @default(cuid())
  invoiceId     String
  feeType       FeeType
  description   String
  unitCount     Int
  unitRateCents Int
  totalCents    Int
  invoice       Invoice @relation(fields: [invoiceId], references: [id])
}

enum InvoiceStatus { DRAFT PENDING_REVIEW SENT PAID OVERDUE DISPUTED }
```

## 8.3 Invoice Calculation Logic

```typescript
// invoice.generate computes fees line by line:
// STORAGE: per day × units in stock × STORAGE_PER_UNIT_DAY rate
// PICK: (1 × PICK_INITIAL) + (max(0, items-1) × PICK_ADDITIONAL)
//        first includedUnits are free per FeeRule
// RECEIVE: FeeRule(RECEIVING_PER_PO) per PO + RECEIVING_PER_UNIT per unit
// PACK: count(Shipments) × PACKING_PER_SHIPMENT rate
// LABELS: count(non-voided labels) × LABEL_PER_SHIPMENT rate
// RETURNS: count(ReturnLines processed) × RETURN_PROCESSING rate
//
// Run LogIQ billing anomaly scan before finalising.
// Store flags in Invoice.anomalyFlags JSON for operator review.
```

## 8.4 UI Pages

| Route                                              | Access              | Description                                                                                                                                                                                       |
| :------------------------------------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/merchants`                                       | Operator            | All merchant cards: orders, inventory value, SLA score, last invoice                                                                                                                              |
| `/merchants/[id]/contract`                         | Operator            | Contract editor: payment period, fee rule table, SLA rules                                                                                                                                        |
| `/merchants/[id]/invoices/[id]`                    | Operator + Merchant | Invoice detail: line breakdown, anomaly flags, PDF download, dispute                                                                                                                              |
| `/portal/dashboard`                                | Merchant only       | Inventory health, open orders, last invoice, recent shipments                                                                                                                                     |
| `/portal/billing`                                  | Merchant only       | Invoice history, current period estimate, dispute form                                                                                                                                            |
| `/portal/settings`                                 | Merchant only       | Contacts, notification preferences                                                                                                                                                                |
| `/portal/settings/integrations`                    | Merchant only       | Connect and manage marketplace integrations — Shopify, WooCommerce, BigCommerce, Etsy, TikTok Shop, eBay. Each platform shows: connection status, last sync time, order count, disconnect button. |
| `/portal/settings/integrations/[platform]/connect` | Merchant only       | OAuth flow entry point per platform. Redirects merchant to platform's OAuth consent screen using LogIQ's registered app credentials.                                                              |

---

# Section 9 — Module 7: Analytics & Reporting

**Build order:** SEVENTH. Reads from all prior modules. No new write models.

## 9.1 Prompt

> Build the Analytics & Reporting module for LogIQ WMS.
>
> Operations Dashboard, Inventory Health, Merchant Performance, Carrier Cost Analysis, Receiving Report, Capacity Forecast, Custom Report Builder with CSV/PDF export. Use Recharts for all charts.
>
> Cache expensive aggregations in Redis with configurable TTL.
>
> UI built with shadcn/ui Cards, Tabs, and Tailwind CSS layout.

## 9.2 Procedures & Metrics

| Procedure                       | Key Metrics                                                                                      | Cache TTL |
| :------------------------------ | :----------------------------------------------------------------------------------------------- | :-------- |
| `analytics.operationsDashboard` | orders_today, fulfillment_rate_pct, avg_pick_time_mins, sla_compliance_pct_7d, pending_orders    | 5 min     |
| `analytics.inventoryHealth`     | total_skus, total_units, inventory_value_cents, low_stock_count, dead_stock_count, top_10_movers | 15 min    |
| `analytics.merchantPerformance` | Per merchant: order_count, units_shipped, billed_cents, sla_pct, breach_count                    | 15 min    |
| `analytics.carrierCost`         | Per carrier: shipment_count, total_cost_cents, avg_cost_cents, on_time_rate_pct, damage_rate_pct | 30 min    |
| `analytics.capacityForecast`    | 7-day predicted orders with confidence bands + recommended_staff per day                         | 1 hour    |
| `analytics.customReport`        | Dynamic dimensions + metrics — tabular output for TanStack Table + chart                         | None      |

## 9.3 Forecasting Algorithm

```typescript
// Exponential smoothing + day-of-week seasonality (alpha = 0.3)
// 1. Get last 90 days of daily order counts
// 2. Compute seasonal indices per day-of-week
// 3. Deseasonalise series
// 4. Apply exponential smoothing
// 5. Forecast N days: reapply seasonal index
// 6. Confidence bands: ±1.96 × std error
// 7. recommendedStaff = ceil(predicted / ORDERS_PER_STAFF_PER_SHIFT)
```

---

# Section 10 — Module 8: Integrations Hub

**Build order:** EIGHTH. Connects LogIQ WMS to external platforms.

## 10.1 Prompt

> Build the Integrations Hub for LogIQ WMS.
>
> Integration management UI, marketplace OAuth connectors (Shopify, WooCommerce, BigCommerce, Etsy, TikTok Shop, eBay), order sync workers per platform, tracking pushback after label creation, EasyPost tracker webhook handler, outbound webhooks via Svix, public REST API with API key management.
>
> **Single connector model:** LogIQ registers one app per platform. All merchants authenticate through LogIQ's OAuth credentials. Each merchant's access token is stored encrypted in their own Integration row — fully isolated.
>
> **Sync strategy:** Webhook-first where the platform supports it (Shopify, BigCommerce, WooCommerce). BullMQ polling fallback every 10 minutes for all platforms. Both paths normalise into the same LogIQ Order model.
>
> UI built with shadcn/ui and Tailwind CSS.

## 10.2 Prisma Schema

```prisma
model Integration {
  id          String            @id @default(cuid())
  accountId   String
  merchantId  String?
  type        IntegrationType
  status      IntegrationStatus @default(CONNECTED)
  credentials Json              // AES-256 encrypted OAuth tokens
  metadata    Json?
  lastSyncAt  DateTime?
  createdAt   DateTime          @default(now())

  @@unique([accountId, merchantId, type])
}

model ApiKey {
  id         String    @id @default(cuid())
  accountId  String
  name       String
  keyHash    String    @unique // bcrypt hash
  keyPrefix  String    // first 8 chars for display
  scopes     String[]
  lastUsedAt DateTime?
  expiresAt  DateTime?
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
}

enum IntegrationType {
  // Tier 1 — Open APIs, OAuth, launch at MVP
  SHOPIFY       // OAuth 2.0 + webhooks
  WOOCOMMERCE   // REST API key (no OAuth — merchant provides key)
  BIGCOMMERCE   // OAuth 2.0 + webhooks
  ETSY          // OAuth 2.0

  // Tier 2 — Added to MVP scope
  TIKTOK_SHOP   // OAuth 2.0
  EBAY          // OAuth 2.0, Orders API + Fulfillment API for tracking pushback

  // Internal / carrier
  EASYPOST      // LogIQ-level, not merchant-facing
  QUICKBOOKS    // Accounting integration
}

enum IntegrationStatus { CONNECTED DISCONNECTED ERROR }
```

## 10.3 Outbound Webhook Events (Svix)

| Event                             | Trigger                             |
| :-------------------------------- | :---------------------------------- |
| `logiqwms.order.created`          | New order ingested from any channel |
| `logiqwms.order.status_changed`   | Fulfillment status updated          |
| `logiqwms.shipment.label_created` | Label purchased via EasyPost        |
| `logiqwms.shipment.delivered`     | Carrier confirmed delivery          |
| `logiqwms.shipment.exception`     | Carrier exception event             |
| `logiqwms.inventory.low_stock`    | Product fell below threshold        |
| `logiqwms.invoice.sent`           | Invoice emailed to merchant         |

## 10.4 Public REST API

| Endpoint                                 | Method     | Description                           |
| :--------------------------------------- | :--------- | :------------------------------------ |
| `/api/v1/orders`                         | GET / POST | List or create orders                 |
| `/api/v1/orders/{id}`                    | GET        | Order detail with lines and shipments |
| `/api/v1/inventory/products`             | GET        | Products with current stock levels    |
| `/api/v1/inventory/products/{sku}/stock` | GET        | Stock level for specific SKU          |
| `/api/v1/shipments/{id}/tracking`        | GET        | Tracking events for shipment          |
| `/api/v1/webhooks`                       | GET / POST | List or register webhook endpoints    |

_Auth: Bearer `{apiKey}` header. Hash with bcrypt compare against `ApiKey.keyHash`. Rate limit: 100 req/min per key via Upstash Redis sliding window._

## 10.5 Marketplace Integration Reference

All 6 marketplace connectors follow the same 4-step pattern:

```
1. OAuth / API key connect   → token stored encrypted in Integration.credentials
2. Order sync                → BullMQ worker polls every 10 min + webhook if supported
3. Order normalise           → normaliser.ts maps platform order → LogIQ Order model
4. Tracking pushback         → after Shipment label created, call platform fulfillment API
```

---

### Shopify

| Attribute         | Detail                                                              |
| :---------------- | :------------------------------------------------------------------ |
| Auth              | OAuth 2.0 — merchant authorises LogIQ's Shopify Partner app         |
| Order sync        | Webhooks (`orders/create`, `orders/updated`) + 10-min poll fallback |
| Tracking pushback | `POST /orders/{id}/fulfillments` with tracking number + carrier     |
| Env vars          | `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`                             |
| Connector         | `server/integrations/shopify.ts`                                    |

---

### WooCommerce

| Attribute         | Detail                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------ |
| Auth              | REST API key — merchant generates key in their WordPress admin and pastes into LogIQ portal (no OAuth needed) |
| Order sync        | Webhooks (`woocommerce_new_order`) + 10-min poll fallback via `GET /wp-json/wc/v3/orders`                     |
| Tracking pushback | `PUT /wp-json/wc/v3/orders/{id}` — update status + add tracking note                                          |
| Env vars          | None (merchant provides their own store URL + consumer key + secret)                                          |
| Connector         | `server/integrations/woocommerce.ts`                                                                          |

---

### BigCommerce

| Attribute         | Detail                                                                              |
| :---------------- | :---------------------------------------------------------------------------------- |
| Auth              | OAuth 2.0 — merchant authorises LogIQ's BigCommerce app from the BC App Marketplace |
| Order sync        | Webhooks (`store/order/created`, `store/order/updated`) + 10-min poll fallback      |
| Tracking pushback | `POST /v2/orders/{id}/shipments` with tracking number, carrier, service             |
| Env vars          | `BIGCOMMERCE_CLIENT_ID`, `BIGCOMMERCE_CLIENT_SECRET`                                |
| Connector         | `server/integrations/bigcommerce.ts`                                                |

---

### Etsy

| Attribute         | Detail                                                                                    |
| :---------------- | :---------------------------------------------------------------------------------------- |
| Auth              | OAuth 2.0 — merchant authorises LogIQ via Etsy's developer OAuth flow                     |
| Order sync        | 10-min poll via `GET /v3/application/shops/{shopId}/receipts` (Etsy webhooks are limited) |
| Tracking pushback | `POST /v3/application/shops/{shopId}/receipts/{receiptId}/tracking`                       |
| Env vars          | `ETSY_CLIENT_ID`, `ETSY_CLIENT_SECRET`                                                    |
| Connector         | `server/integrations/etsy.ts`                                                             |

---

### TikTok Shop

| Attribute         | Detail                                                                        |
| :---------------- | :---------------------------------------------------------------------------- |
| Auth              | OAuth 2.0 — merchant authorises LogIQ's TikTok Shop app                       |
| Order sync        | Webhooks (`ORDER_STATUS_CHANGE`) + 10-min poll fallback via `GET /order/list` |
| Tracking pushback | `POST /fulfillment/ship_package` with tracking number + carrier code          |
| Env vars          | `TIKTOK_SHOP_APP_KEY`, `TIKTOK_SHOP_APP_SECRET`                               |
| Connector         | `server/integrations/tiktok-shop.ts`                                          |

---

### eBay

| Attribute         | Detail                                                                                                                   |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------- |
| Auth              | OAuth 2.0 (LWA) — merchant authorises LogIQ via eBay's OAuth consent page                                                |
| Order sync        | 10-min poll via eBay Orders API `GET /sell/fulfillment/v1/order`                                                         |
| Tracking pushback | eBay Fulfillment API — `POST /sell/fulfillment/v1/order/{orderId}/shipping_fulfillment`                                  |
| Env vars          | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`                                                                                   |
| Connector         | `server/integrations/ebay.ts`                                                                                            |
| Note              | Two separate API namespaces: Orders API (fetch orders) + Fulfillment API (push tracking). Both use the same OAuth token. |

---

### Order Normaliser (`server/integrations/normaliser.ts`)

Every connector calls `normaliseOrder()` before writing to the database. This guarantees all orders — regardless of source platform — share the same LogIQ `Order` shape.

```typescript
// Shared fields mapped from every platform:
interface NormalisedOrder {
  channelOrderId: string; // platform's own order ID
  channel: IntegrationType; // SHOPIFY | WOOCOMMERCE | BIGCOMMERCE | ETSY | TIKTOK_SHOP | EBAY
  merchantId: string;
  accountId: string;
  shippingName: string;
  shippingLine1: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  lines: {
    sku: string;
    quantity: number;
  }[];
  slaHours?: number; // derived from platform SLA or merchant contract
}
```

---

### BullMQ Sync Jobs

| Job                             | Schedule                         | Action                                                                   |
| :------------------------------ | :------------------------------- | :----------------------------------------------------------------------- |
| `integration.sync.shopify`      | Every 10 min + on webhook        | Fetch new/updated orders, normalise, upsert into Order table             |
| `integration.sync.woocommerce`  | Every 10 min + on webhook        | Same                                                                     |
| `integration.sync.bigcommerce`  | Every 10 min + on webhook        | Same                                                                     |
| `integration.sync.etsy`         | Every 10 min                     | Same (no reliable webhook)                                               |
| `integration.sync.tiktok`       | Every 10 min + on webhook        | Same                                                                     |
| `integration.sync.ebay`         | Every 10 min                     | Same (no reliable webhook)                                               |
| `integration.tracking.pushback` | On `Shipment.labelCreated` event | Call platform fulfillment API with tracking number. Retry 3× on failure. |

---

### tRPC Procedures — Integrations

| Procedure                    | Access           | Description                                                              |
| :--------------------------- | :--------------- | :----------------------------------------------------------------------- |
| `integration.list`           | `merchant_owner` | List all connected integrations for the merchant with status + last sync |
| `integration.getOAuthUrl`    | `merchant_owner` | Generate platform OAuth URL for a given `IntegrationType`                |
| `integration.handleCallback` | System           | Exchange OAuth code for token, store encrypted in Integration row        |
| `integration.disconnect`     | `merchant_owner` | Revoke token + delete Integration row + stop sync jobs                   |
| `integration.syncNow`        | `merchant_owner` | Manually trigger an immediate order sync for a connected platform        |
| `integration.getSyncLog`     | `merchant_owner` | Last 50 sync events: orders fetched, errors, timestamp                   |

---

# Section 11 — Module 9: Notification & Alert Center

**Build order:** NINTH. Depends on all prior modules. Delivers alerts across every channel.

## 11.1 Prompt

> Build the complete Notification & Alert Center for LogIQ WMS.
>
> In-app notification bell with unread count, user notification preferences (per-alert-type and per-channel: email/Slack/SMS), escalation rules for unacknowledged critical alerts, SMS via Twilio, and web browser push notifications.
>
> All Prisma models, BullMQ job definitions, tRPC procedures, and UI.
>
> UI built with shadcn/ui and Tailwind CSS.

## 11.2 Prisma Schema

```prisma
model Notification {
  id         String              @id @default(cuid())
  accountId  String
  userId     String?             // null = broadcast to all operator roles
  merchantId String?
  type       NotificationType
  severity   NotificationSeverity @default(INFO)
  title      String
  body       String
  data       Json?               // deep-link URL, reference IDs
  channel    NotificationChannel
  readAt     DateTime?
  sentAt     DateTime?
  failedAt   DateTime?
  createdAt  DateTime            @default(now())

  @@index([accountId, userId, readAt])
}

enum NotificationType {
  LOW_STOCK
  DEAD_STOCK
  STOCKOUT_RISK
  SLA_BREACH
  ORDER_EXCEPTION
  SHIPMENT_DELIVERED
  INVOICE_GENERATED
  INVOICE_OVERDUE
  CYCLE_COUNT_DUE
  PO_OVERDUE
  CARRIER_EXCEPTION
  CAPACITY_WARNING
}

enum NotificationSeverity { INFO WARNING CRITICAL }
enum NotificationChannel { IN_APP EMAIL SLACK SMS PUSH }

model NotificationPreference {
  id        String           @id @default(cuid())
  userId    String
  accountId String
  type      NotificationType
  inApp     Boolean          @default(true)
  email     Boolean          @default(true)
  slack     Boolean          @default(false)
  sms       Boolean          @default(false)
  push      Boolean          @default(true)

  @@unique([userId, type])
}

model EscalationRule {
  id               String               @id @default(cuid())
  accountId        String
  severity         NotificationSeverity
  ackWindowMinutes Int                  @default(120)
  escalateTo       String[]             // AccountUser ids
  escalateViaSms   Boolean              @default(true)
}
```

## 11.3 BullMQ Jobs

| Job                | Trigger                                        | Action                                                                                                                                    |
| :----------------- | :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `notify.dispatch`  | Any domain event (low stock, SLA breach, etc.) | Look up NotificationPreferences for affected users. Enqueue one job per channel: `notify.sendEmail`, `notify.sendSms`, `notify.sendPush`. |
| `notify.sendEmail` | `notify.dispatch` output                       | Send via Resend with React Email template matching NotificationType.                                                                      |
| `notify.sendSms`   | `notify.dispatch` output                       | Send via Twilio SMS API. Store Twilio message SID in `Notification.data`.                                                                 |
| `notify.sendPush`  | `notify.dispatch` output                       | Send via Web Push API using VAPID keys to subscribed browser clients.                                                                     |
| `notify.escalate`  | Scheduled: every 15 minutes                    | Find CRITICAL Notifications older than `EscalationRule.ackWindowMinutes` with `readAt=null`. Send SMS to `escalateTo` users.              |

## 11.4 tRPC Procedures

| Procedure                        | Description                                                                    |
| :------------------------------- | :----------------------------------------------------------------------------- |
| `notifications.list`             | Paginated unread + recent notifications for current user. Returns unreadCount. |
| `notifications.markRead`         | Mark single or all notifications as read for current user.                     |
| `notifications.getPreferences`   | Get all NotificationPreference rows for current user.                          |
| `notifications.updatePreference` | Toggle channels per notification type.                                         |
| `notifications.subscribe`        | Register browser push subscription (PushSubscription object) for this device.  |
| `escalation.getRules`            | Get EscalationRules for account.                                               |
| `escalation.upsertRule`          | Create or update escalation rule per severity level.                           |

## 11.5 UI Components

| Component / Route         | Description                                                                    |
| :------------------------ | :----------------------------------------------------------------------------- |
| `NotificationBell`        | Header icon with animated unread badge. Click opens NotificationDrawer.        |
| `NotificationDrawer`      | Slide-in panel: grouped by severity, mark all read button, deep-link on click. |
| `/settings/notifications` | Preference grid: rows = NotificationType, columns = channels. Toggle per cell. |
| `SlackConnectButton`      | OAuth flow to connect Slack workspace for operator Slack notifications.        |

### Notification Dispatch Pattern

```typescript
// Called from any service layer after a domain event:

import { notifyQueue } from "@/server/jobs/queues";

await notifyQueue.add("notify.dispatch", {
  accountId,
  type: "LOW_STOCK",
  severity: "WARNING",
  title: `Low stock: ${product.sku}`,
  body: `${product.name} has ${availableQty} units remaining.`,
  data: { productId: product.id, actionUrl: "/inventory/alerts" },
  targetUserIds: null, // null = all operator roles
  merchantId: product.merchantId,
});
```

---

# Section 12 — Module 10: Barcode & Label Generation

**Build order:** TENTH. Depends on Inventory (products need barcodes) and Outbound (shipping labels).

## 12.1 Prompt

> Build the Barcode & Label Generation module for LogIQ WMS.
>
> Product barcode generation (Code 128, QR, EAN-13) when a SKU is created, bin location label printing, pallet receiving labels, and a label template designer with custom logo and field layout per label type.
>
> All Prisma models, tRPC procedures, generation logic, and UI.
>
> UI built with shadcn/ui and Tailwind CSS. Template designer uses a responsive canvas layout.

## 12.2 Prisma Schema

```prisma
model LabelTemplate {
  id        String    @id @default(cuid())
  accountId String
  name      String
  type      LabelType
  widthMm   Float     @default(101.6) // 4 inches
  heightMm  Float     @default(152.4) // 6 inches
  fields    Json      // array of FieldConfig objects
  logoUrl   String?
  isDefault Boolean   @default(false)
  createdAt DateTime  @default(now())

  @@index([accountId, type])
}

enum LabelType { PRODUCT_BARCODE BIN_LOCATION PALLET SHIPPING_OUTER }

// FieldConfig shape (stored in fields Json):
// { id, type: 'text'|'barcode'|'qr'|'logo'|'line',
//   content: 'static text' | '{{sku}}' | '{{binLabel}}' | ...,
//   x, y, width, height, fontSize?, barcodeFormat? }

model GeneratedLabel {
  id            String   @id @default(cuid())
  accountId     String
  templateId    String
  referenceId   String   // productId | binId | palletId
  referenceType String   // 'PRODUCT' | 'BIN' | 'PALLET'
  pdfUrl        String   // S3 URL
  zplContent    String?  // ZPL string for direct thermal printing
  createdAt     DateTime @default(now())

  @@index([accountId, referenceId])
}
```

## 12.3 Generation Logic

```typescript
// Dependencies:
// bwip-js — generates Code128, QR, EAN-13 as PNG buffer
// pdf-lib — composes label PDF from template fields
// labelary — converts ZPL to PNG preview

async function generateProductLabel(productId: string, templateId: string) {
  const product = await db.product.findUniqueOrThrow({
    where: { id: productId },
  });
  const template = await db.labelTemplate.findUniqueOrThrow({
    where: { id: templateId },
  });
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([
    mmToPt(template.widthMm),
    mmToPt(template.heightMm),
  ]);

  for (const field of template.fields) {
    const value = resolveToken(field.content, { product });
    if (field.type === "barcode") {
      const barcodeImg = await bwipjs.toBuffer({
        bcid: field.barcodeFormat ?? "code128",
        text: value,
        scale: 3,
        height: 10,
      });
      const img = await pdf.embedPng(barcodeImg);
      page.drawImage(img, {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      });
    } else if (field.type === "text") {
      page.drawText(value, {
        x: field.x,
        y: field.y,
        size: field.fontSize ?? 10,
      });
    }
  }

  const pdfBytes = await pdf.save();
  const s3Key = `${product.accountId}/product-labels/${productId}.pdf`;
  await s3.upload(s3Key, pdfBytes);

  return db.generatedLabel.create({
    data: {
      accountId: product.accountId,
      templateId,
      referenceId: productId,
      referenceType: "PRODUCT",
      pdfUrl: toS3Url(s3Key),
    },
  });
}
```

## 12.4 tRPC Procedures

| Procedure               | Description                                                             |
| :---------------------- | :---------------------------------------------------------------------- |
| `labelTemplate.create`  | Create template with field layout, logo URL, dimensions per LabelType   |
| `labelTemplate.update`  | Update template fields, mark as default for type                        |
| `labelTemplate.list`    | List templates by LabelType for account                                 |
| `label.generateProduct` | Generate barcode label PDF for a productId, auto-apply default template |
| `label.generateBin`     | Generate bin location label PDF (bin label, zone, aisle/rack/level)     |
| `label.generatePallet`  | Generate pallet label for inbound PO receiving                          |
| `label.getByReference`  | Get all generated labels for a product/bin/pallet                       |

## 12.5 UI Pages

| Route                      | Description                                                                                     |
| :------------------------- | :---------------------------------------------------------------------------------------------- |
| `/labels/templates`        | Template list by type with preview thumbnail                                                    |
| `/labels/templates/new`    | Template designer: drag-and-drop field placement on canvas, barcode type selector, token picker |
| `/inventory/products/[id]` | Print barcode label button — generates and opens print dialog                                   |
| `/inventory/locations`     | Print bin label button on each bin card                                                         |

---

# Section 13 — Module 11: Packaging Library

**Build order:** ELEVENTH. Depends on Inventory and Outbound. Drives DIM weight optimisation.

## 13.1 Prompt

> Build the Packaging Library module for LogIQ WMS.
>
> A library of box types with dimensions and cost, smart box selection (suggest smallest box that fits the order items), DIM weight calculation per carrier, and packaging cost tracking per shipment and per merchant.
>
> UI built with shadcn/ui and Tailwind CSS.

## 13.2 Prisma Schema

```prisma
model PackagingType {
  id           String   @id @default(cuid())
  accountId    String
  name         String   // e.g. 'Small Box 8x6x4'
  lengthIn     Float
  widthIn      Float
  heightIn     Float
  maxWeightOz  Float
  tareWeightOz Float    @default(0) // box own weight
  costCents    Int      @default(0) // per unit cost
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  @@index([accountId])
}

// Add to Shipment model:
// packagingTypeId    String?
// packagingCostCents Int?
// dimWeightOz        Float? // computed: (L×W×H) / carrier DIM divisor
```

## 13.3 Smart Box Selection Logic

```typescript
// Given order lines, find smallest box that fits all items:
async function suggestPackaging(accountId: string, orderLines: OrderLine[]) {
  const products = await getProductsWithDims(orderLines);

  // Compute total volume of items (simple sum — no 3D bin packing)
  const totalVolumeIn3 = products.reduce(
    (sum, p) => sum + p.lengthIn * p.widthIn * p.heightIn * p.qty,
    0,
  );
  const totalWeightOz = products.reduce(
    (sum, p) => sum + p.weightOz * p.qty,
    0,
  );

  // Find smallest box that fits volume and weight
  const boxes = await db.packagingType.findMany({
    where: {
      accountId,
      isActive: true,
      maxWeightOz: { gte: totalWeightOz },
    },
    orderBy: [{ lengthIn: "asc" }],
  });

  return boxes
    .filter((b) => b.lengthIn * b.widthIn * b.heightIn >= totalVolumeIn3)
    .slice(0, 3); // return top 3 suggestions
}

// DIM weight: (L×W×H) / divisor
// Carrier divisors: USPS=166, FedEx=139, UPS=139, DHL=139
const dimWeight = (box: PackagingType, carrier: string) =>
  (box.lengthIn * box.widthIn * box.heightIn) / DIM_DIVISORS[carrier];

// Billable weight = max(actual weight, DIM weight)
const billableWeight = (actualOz: number, dimOz: number) =>
  Math.max(actualOz, dimOz);
```

## 13.4 tRPC Procedures

| Procedure              | Description                                                                   |
| :--------------------- | :---------------------------------------------------------------------------- |
| `packaging.create`     | Create box type with dimensions, weight limit, cost                           |
| `packaging.list`       | List all active packaging types for account                                   |
| `packaging.suggest`    | Input: orderLines. Returns: top 3 box suggestions with DIM weight per carrier |
| `packaging.costReport` | Monthly packaging cost per merchant: units used × costCents per box type      |

## 13.5 Integration With Packing Station

On the packing station UI (`/packing/[id]`), after items are confirmed, show the packaging suggester panel. Staff selects a box, system auto-fills weight/dims in the Rate Shop call with: `actualWeight = items weight + box tare weight`. DIM weight calculated and displayed alongside billable weight before rate purchase.

---

# Section 14 — Module 12: Batch Label Printing & Print Queue

**Build order:** TWELFTH. Depends on Outbound and Barcode modules.

## 14.1 Prompt

> Build the Batch Label Printing & Print Queue module for LogIQ WMS.
>
> A print queue for batch-buying labels across multiple orders at once, end-of-day shipping manifest (USPS SCAN form), reprint workflow for failed/voided labels, and ZPL thermal printer management (register by IP).
>
> UI built with shadcn/ui and Tailwind CSS.

## 14.2 Prisma Schema

```prisma
model PrintQueue {
  id          String           @id @default(cuid())
  accountId   String
  warehouseId String
  name        String           // e.g. 'EOD Batch 2026-04-19'
  status      PrintQueueStatus @default(PENDING)
  labelCount  Int              @default(0)
  printedAt   DateTime?
  createdBy   String
  createdAt   DateTime         @default(now())
  items       PrintQueueItem[]

  @@index([accountId, warehouseId])
}

enum PrintQueueStatus { PENDING PURCHASING READY PRINTED PARTIAL_FAILED }

model PrintQueueItem {
  id             String          @id @default(cuid())
  queueId        String
  orderId        String
  shipmentId     String?         // populated after label purchased
  easypostRateId String
  status         PrintItemStatus @default(PENDING)
  errorMessage   String?
  labelUrl       String?
  queue          PrintQueue      @relation(fields: [queueId], references: [id])

  @@index([queueId])
}

enum PrintItemStatus { PENDING PURCHASED FAILED PRINTED REPRINTED }

model ThermalPrinter {
  id          String   @id @default(cuid())
  accountId   String
  warehouseId String
  name        String   // e.g. 'Station 1 — Zebra ZD421'
  ipAddress   String
  port        Int      @default(9100)
  labelWidth  Float    @default(101.6)
  labelHeight Float    @default(152.4)
  isOnline    Boolean  @default(false)
  lastPingAt  DateTime?
  createdAt   DateTime @default(now())

  @@index([accountId, warehouseId])
}
```

## 14.3 Batch Purchase Logic

```typescript
// printQueue.purchase — bulk-buy labels for all PENDING items in queue
async function purchaseBatchLabels(queueId: string) {
  const queue = await db.printQueue.findUniqueOrThrow({
    where: { id: queueId },
    include: { items: true },
  });

  // Process in parallel with concurrency limit (avoid EasyPost rate limit)
  const results = await pLimit(5)(
    queue.items.map((item) => async () => {
      try {
        const rate = await easypost.Rate.retrieve(item.easypostRateId);
        const shipment = await easypost.Shipment.buy(rate.shipment_id, {
          rate: { id: item.easypostRateId },
        });
        const labelUrl = await uploadLabelToS3(
          shipment.postage_label.label_url,
        );
        await db.printQueueItem.update({
          where: { id: item.id },
          data: {
            status: "PURCHASED",
            labelUrl,
            shipmentId: shipment.id,
          },
        });
      } catch (e: any) {
        await db.printQueueItem.update({
          where: { id: item.id },
          data: {
            status: "FAILED",
            errorMessage: e.message,
          },
        });
      }
    }),
  );

  // Update queue status
  const failed = results.filter((r) => r.status === "FAILED").length;
  await db.printQueue.update({
    where: { id: queueId },
    data: {
      status: failed > 0 ? "PARTIAL_FAILED" : "READY",
    },
  });
}
```

## 14.4 tRPC Procedures

| Procedure                     | Description                                                                           |
| :---------------------------- | :------------------------------------------------------------------------------------ |
| `printQueue.create`           | Create queue from orderIds[] with pre-selected EasyPost rate per order                |
| `printQueue.purchase`         | Batch-buy all labels in queue concurrently (p-limit 5)                                |
| `printQueue.printAll`         | Send all purchased labels to designated ThermalPrinter via RAW TCP socket (port 9100) |
| `printQueue.reprint`          | Reprint single item — regenerate ZPL and send to printer                              |
| `printQueue.generateManifest` | Generate USPS SCAN form for all USPS shipments in queue via EasyPost Manifest API     |
| `printer.register`            | Add ThermalPrinter: name, IP, port, dimensions                                        |
| `printer.ping`                | Test TCP connection to printer IP:port, update isOnline                               |

## 14.5 UI Pages

| Route                | Description                                                                                                          |
| :------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `/printing`          | Active print queues with status badges and item counts                                                               |
| `/printing/new`      | Create batch: select orders from unfulfilled list, rate shop per order, add to queue                                 |
| `/printing/[id]`     | Queue detail: item list with status per label, purchase all, print all, SCAN form download, reprint individual items |
| `/settings/printers` | Printer list: name, IP, online status, ping button, register new printer                                             |

---

# Section 15 — Module 13: Multi-Warehouse Order Routing Engine

**Build order:** THIRTEENTH. Depends on Inventory and Orders. Critical for accounts with 2+ warehouses.

## 15.1 Prompt

> Build the Multi-Warehouse Order Routing Engine for LogIQ WMS.
>
> Auto-routing rules (route order to closest warehouse to delivery address), split shipment logic (split order across two warehouses if one is out of stock), inventory reservation across all warehouses before marking unfulfillable, and transfer order workflow (move stock between warehouses).
>
> UI built with shadcn/ui and Tailwind CSS.

## 15.2 Prisma Schema

```prisma
model RoutingRule {
  id          String        @id @default(cuid())
  accountId   String
  merchantId  String?       // null = applies to all merchants
  priority    Int           @default(0) // higher = evaluated first
  name        String
  conditions  Json          // array of Condition objects
  action      RoutingAction
  warehouseId String?       // target warehouse (for ASSIGN_TO action)
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())

  @@index([accountId])
}

// Condition shape:
// { field: 'destinationState'|'orderValue'|'carrier'|'sku',
//   operator: 'eq'|'in'|'gte'|'lte', value: any }

enum RoutingAction {
  ASSIGN_TO_WAREHOUSE // send to specific warehouseId
  ASSIGN_NEAREST      // geo-closest warehouse with stock
  SPLIT_SHIPMENT      // split if no single warehouse has all stock
  HOLD_FOR_STOCK      // put ON_HOLD if all warehouses have insufficient stock
}

model TransferOrder {
  id              String            @id @default(cuid())
  accountId       String
  fromWarehouseId String
  toWarehouseId   String
  toNumber        String            // TO-{year}-{seq}
  status          TransferStatus    @default(PENDING)
  requestedBy     String
  completedAt     DateTime?
  createdAt       DateTime          @default(now())
  lines           TransferOrderLine[]

  @@index([accountId])
}

model TransferOrderLine {
  id           String        @id @default(cuid())
  transferId   String
  productId    String
  requestedQty Int
  shippedQty   Int           @default(0)
  receivedQty  Int           @default(0)
  transfer     TransferOrder @relation(fields: [transferId], references: [id])
}

enum TransferStatus { PENDING SHIPPED PARTIALLY_RECEIVED RECEIVED CANCELLED }
```

## 15.3 Routing Algorithm

```typescript
async function routeOrder(orderId: string) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { lines: true, merchant: true },
  });

  // 1. Evaluate RoutingRules in priority order
  const rules = await db.routingRule.findMany({
    where: {
      accountId: order.accountId,
      OR: [{ merchantId: order.merchantId }, { merchantId: null }],
      isActive: true,
    },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    if (!evaluateConditions(rule.conditions, order)) continue;
    if (rule.action === "ASSIGN_TO_WAREHOUSE") {
      return assignOrderToWarehouse(order, rule.warehouseId);
    }
    if (rule.action === "ASSIGN_NEAREST") {
      return assignToNearestWarehouse(order);
    }
    if (rule.action === "SPLIT_SHIPMENT") {
      return splitOrderAcrossWarehouses(order);
    }
  }

  // Fallback: assign to nearest warehouse with full stock
  return assignToNearestWarehouse(order);
}

async function assignToNearestWarehouse(order: Order) {
  const warehouses = await getWarehousesWithFullStock(order);
  if (!warehouses.length) return splitOrderAcrossWarehouses(order);

  // Geo-distance: use Haversine formula on warehouse ZIP vs order ZIP
  const sorted = warehouses.sort(
    (a, b) =>
      haversine(order.shippingZip, a.zip) - haversine(order.shippingZip, b.zip),
  );

  return assignOrderToWarehouse(order, sorted[0].id);
}

async function splitOrderAcrossWarehouses(order: Order) {
  // For each line, find warehouse with best stock
  // Group lines by warehouse, create one sub-order per warehouse
  // Link sub-orders to parent order via parentOrderId
}
```

## 15.4 tRPC Procedures

| Procedure               | Description                                                                    |
| :---------------------- | :----------------------------------------------------------------------------- |
| `routing.rules.list`    | List all routing rules for account ordered by priority                         |
| `routing.rules.upsert`  | Create or update routing rule with conditions and action                       |
| `routing.rules.reorder` | Update priority of multiple rules at once (drag-and-drop)                      |
| `routing.route`         | Manually trigger routing for a specific orderId                                |
| `transfer.create`       | Create TransferOrder between two warehouses with product lines                 |
| `transfer.ship`         | Mark transfer as SHIPPED — creates OUTBOUND StockMovements at source warehouse |
| `transfer.receive`      | Receive transfer — creates INBOUND StockMovements at destination warehouse     |

## 15.5 UI Pages

| Route               | Description                                                                  |
| :------------------ | :--------------------------------------------------------------------------- |
| `/settings/routing` | Routing rules list with drag-to-reorder priority, rule builder drawer        |
| `/transfers`        | Transfer order list with status and warehouse route                          |
| `/transfers/new`    | Create transfer: from warehouse, to warehouse, product lines with quantities |
| `/transfers/[id]`   | Transfer detail: line progress, ship action, receive action with scan UI     |

---

# Section 16 — Module 14: Platform Billing via Polar

**Build order:** FOURTEENTH. The revenue layer — charges 3PL operators for using LogIQ WMS.

## 16.1 Why Polar

| Feature                 | Polar Support                                                      |
| :---------------------- | :----------------------------------------------------------------- |
| Subscription management | Products, prices, plans with monthly/annual billing                |
| Usage-based billing     | Meter events (orders processed, labels bought) → auto-billed       |
| Invoicing               | Auto-generated PDF invoices emailed to customers                   |
| Customer portal         | Self-service portal: upgrade, downgrade, cancel, download invoices |
| Webhooks                | subscription.created/updated/cancelled, payment events             |
| Next.js SDK             | `@polar-sh/nextjs` — first-class App Router support                |
| Free tier friendly      | No monthly minimum — pay per transaction, ideal for SaaS           |
| Open source             | Self-hostable, transparent, no vendor lock-in                      |

## 16.2 Plan Structure

| Plan       | Price   | Limits                                      | Features                                         |
| :--------- | :------ | :------------------------------------------ | :----------------------------------------------- |
| Starter    | $49/mo  | 500 orders/mo, 1 warehouse, 5 merchants     | Core WMS, rate shop, basic analytics             |
| Growth     | $149/mo | 5,000 orders/mo, 3 warehouses, 25 merchants | All WMS modules, LogIQ AI, priority support      |
| Enterprise | Custom  | Unlimited                                   | All modules, SLA guarantee, dedicated onboarding |

_Overage billing: $0.05 per order above plan limit, metered via Polar usage events._

## 16.3 Polar Configuration

```typescript
// app/api/polar/route.ts

import { Webhooks } from "@polar-sh/nextjs";
import { db } from "@/lib/db";

export const { POST } = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onSubscriptionCreated: async (event) => {
    const { customerId, productId, metadata } = event.data;
    const accountId = metadata.accountId;
    const plan = POLAR_PRODUCT_TO_PLAN[productId];
    await db.account.update({
      where: { id: accountId },
      data: { plan, polarCustomerId: customerId },
    });
  },
  onSubscriptionUpdated: async (event) => {
    const plan = POLAR_PRODUCT_TO_PLAN[event.data.productId];
    const accountId = event.data.metadata.accountId;
    await db.account.update({
      where: { id: accountId },
      data: { plan },
    });
  },
  onSubscriptionCancelled: async (event) => {
    const accountId = event.data.metadata.accountId;
    await db.account.update({
      where: { id: accountId },
      data: { plan: "STARTER" },
    });
  },
});
```

## 16.4 Usage Metering

```typescript
// Call after every billable action — BullMQ job:

import { Polar } from "@polar-sh/sdk";

const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN });

// After order fulfilled:
await polar.meters.ingest({
  customerId: account.polarCustomerId,
  event: "order_fulfilled",
  quantity: 1,
  metadata: { accountId: account.id, orderId },
});

// After label purchased:
await polar.meters.ingest({
  customerId: account.polarCustomerId,
  event: "label_purchased",
  quantity: 1,
  metadata: { accountId: account.id, shipmentId },
});
```

## 16.5 Plan Enforcement

```typescript
// Middleware: check plan limits before order creation

async function enforcePlanLimits(accountId: string) {
  const account = await db.account.findUniqueOrThrow({
    where: { id: accountId },
  });
  const limits = PLAN_LIMITS[account.plan];

  // Orders this billing month
  const monthStart = startOfMonth(new Date());
  const orderCount = await db.order.count({
    where: { accountId, createdAt: { gte: monthStart } },
  });

  if (orderCount >= limits.ordersPerMonth) {
    // Meter overage — do NOT block the order
    await polar.meters.ingest({
      customerId: account.polarCustomerId,
      event: "overage_order",
      quantity: 1,
    });
  }

  // Hard limits (warehouse count, merchant count):
  const warehouseCount = await db.warehouse.count({ where: { accountId } });
  if (warehouseCount >= limits.warehouses)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your plan allows ${limits.warehouses} warehouses. Upgrade to add more.`,
    });
}
```

## 16.6 tRPC Procedures

| Procedure                 | Description                                                           |
| :------------------------ | :-------------------------------------------------------------------- |
| `billing.getSubscription` | Get current Polar subscription + plan for account                     |
| `billing.getUsage`        | Current month usage: orders processed, labels bought vs plan limits   |
| `billing.createCheckout`  | Create Polar checkout session for plan upgrade — returns checkout URL |
| `billing.getPortalUrl`    | Get Polar customer portal URL for self-service billing management     |
| `billing.getInvoices`     | List past Polar invoices with PDF download links                      |

## 16.7 UI Pages

| Route                       | Description                                                                   |
| :-------------------------- | :---------------------------------------------------------------------------- |
| `/settings/billing`         | Current plan card, usage meters (orders/labels), upgrade button, invoice list |
| `/settings/billing/upgrade` | Plan comparison table with Polar checkout embed or redirect                   |
| `/onboarding/plan`          | Plan selection step during operator onboarding — Polar checkout               |

### Plan Limit Constants

```typescript
const PLAN_LIMITS = {
  STARTER: { ordersPerMonth: 500, warehouses: 1, merchants: 5 },
  GROWTH: { ordersPerMonth: 5000, warehouses: 3, merchants: 25 },
  ENTERPRISE: {
    ordersPerMonth: Infinity,
    warehouses: Infinity,
    merchants: Infinity,
  },
};
```

---

# Section 17 — Module 15: LogIQ — AI Co-Pilot Layer

**Build order:** LAST. Reads from all modules. Adds intelligence without changing existing data flows.

## 17.1 Prompt

> Build the complete LogIQ AI layer for LogIQ WMS.
>
> 1. Natural language query engine (Claude API + tenant-scoped SQL)
> 2. Predictive stockout and overstock alerts (BullMQ nightly job)
> 3. Smart carrier recommendation engine (CarrierPerformanceLog analysis)
> 4. Billing anomaly detector (pre-invoice Claude scan)
> 5. Fulfillment capacity forecasting (exponential smoothing)
> 6. Merchant-facing AI chat widget (tenant-scoped Claude)
> 7. Proactive insight feed (daily digest to operators)
>
> UI built with shadcn/ui and Tailwind CSS.

## 17.2 Prisma Schema

```prisma
model LogIQInsight {
  id             String          @id @default(cuid())
  accountId      String
  merchantId     String?
  type           InsightType
  severity       InsightSeverity
  title          String
  body           String
  data           Json?
  actionUrl      String?
  acknowledgedAt DateTime?
  acknowledgedBy String?
  createdAt      DateTime        @default(now())

  @@index([accountId, acknowledgedAt])
}

enum InsightType {
  STOCKOUT_RISK
  OVERSTOCK
  CARRIER_PERFORMANCE_CHANGE
  BILLING_ANOMALY
  SLA_BREACH_RISK
  CAPACITY_WARNING
  PICK_RATE_DROP
}

enum InsightSeverity { INFO WARNING CRITICAL }

model CarrierScorecard {
  id              String   @id @default(cuid())
  accountId       String
  carrier         String
  service         String
  destinationZone Int?
  weightTier      String?
  onTimeRate      Float
  damageRate      Float
  avgCostCents    Int
  avgActualDays   Float
  score           Float
  updatedAt       DateTime @updatedAt

  @@unique([accountId, carrier, service, destinationZone, weightTier])
}
```

## 17.3 Natural Language Query Engine

```typescript
// server/ai/query-engine.ts

const SYSTEM_PROMPT = `
You are LogIQ, the AI data assistant for LogIQ WMS.
You have read-only access to these PostgreSQL tables for account {accountId}:

TABLES (all pre-filtered by account_id = '{accountId}'):
products(id, merchant_id, name, sku, barcode)
stock_levels(id, product_id, bin_id, warehouse_id, quantity, reserved_qty)
stock_movements(id, product_id, type, quantity_delta, created_at)
orders(id, merchant_id, status, fulfillment_status, due_at, created_at)
shipments(id, order_id, carrier, service, rate_cents, status)
merchants(id, name)
invoices(id, merchant_id, period_start, period_end, total_cents, status)
carrier_performance_logs(id, carrier, service, on_time, actual_days)

RULES:
1. Only generate SELECT queries.
2. Always add WHERE account_id = '{accountId}' to every table.
3. Return JSON: { sql, chartType: 'bar'|'line'|'table'|null, explanation }
4. If unanswerable: { sql: null, explanation: 'reason' }
`;

export async function runNLQuery(accountId: string, queryText: string) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT.replace(/{accountId}/g, accountId),
    messages: [{ role: "user", content: queryText }],
  });

  const { sql, chartType, explanation } = JSON.parse(
    completion.content[0].text,
  );

  if (!sql) return { explanation, data: null };
  const data = await db.$queryRawUnsafe(sql);
  return { explanation, data, chartType };
}
```

## 17.4 BullMQ Nightly Jobs

| Job                      | Schedule          | Action                                                                                                                            |
| :----------------------- | :---------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `logiq.stockoutScan`     | Every 6 hours     | Compute 14-day velocity per SKU. Create `STOCKOUT_RISK` insight if `daysOfStockRemaining < 7`.                                    |
| `logiq.overstockScan`    | Daily 02:00 UTC   | Find StockLevels with `quantity > 0` and no movement for `deadStockDays`. Create `OVERSTOCK` insight with carrying cost.          |
| `logiq.carrierScorecard` | Daily 03:00 UTC   | Aggregate CarrierPerformanceLog. Score = `onTimeRate×0.5 + (1-damageRate)×0.3 + costEfficiency×0.2`. Upsert CarrierScorecard.     |
| `logiq.capacityForecast` | Daily 04:00 UTC   | Run exponential smoothing per warehouse. Cache in Redis 24h. Create `CAPACITY_WARNING` if any day > historical_max × 0.9.         |
| `logiq.insightDigest`    | Daily 07:00 local | Bundle unacknowledged CRITICAL+WARNING insights from past 24h. Send email digest via Resend to operator_owner and operator_admin. |

## 17.5 Billing Anomaly Detector

```typescript
// Detects before invoice is sent. Anomaly types:
// QUANTITY_MISMATCH — pick count != order line count
// VACATED_BIN_STORAGE — storage charged for empty bin
// RATE_MISMATCH — rate doesn't match FeeRule in contract
// DUPLICATE_CHARGE — same order charged twice
// UNUSUAL_TOTAL — invoice total >15% above merchant's avg
//
// Called in invoice.generate — passes draft lines + source data to Claude.
// Claude returns: [ { lineId, severity, type, description,
//                     expectedValue, actualValue } ]
// Stored in Invoice.anomalyFlags JSON.
// Operator reviews flags before sending invoice.
```

## 17.6 tRPC Procedures

| Procedure                    | Description                                                           |
| :--------------------------- | :-------------------------------------------------------------------- |
| `logiq.query`                | NL query → explanation + data[] + chartType. Logs to LogIQQuery.      |
| `logiq.getInsights`          | Paginated unacknowledged insights by severity                         |
| `logiq.acknowledgeInsight`   | Mark insight acknowledged with user + timestamp                       |
| `logiq.getStockForecast`     | StockForecast rows sorted by stockoutRisk DESC                        |
| `logiq.getCarrierScorecards` | CarrierScorecard rows filtered by carrier/zone/weightTier             |
| `logiq.merchantChat`         | Merchant-scoped streaming chat via Claude. Tenant isolation enforced. |
| `logiq.getCapacityForecast`  | 7-day forecast from Redis cache for a warehouse                       |

## 17.7 UI Components

| Component / Route       | Description                                                                                  |
| :---------------------- | :------------------------------------------------------------------------------------------- |
| `/logiq`                | Hub: NL query bar, insight feed, carrier scorecard panel                                     |
| `LogIQQueryBar`         | Text input + suggestion chips, streaming response area with chart rendering                  |
| `InsightFeed`           | Severity-badged cards with deep-link action and acknowledge button                           |
| `StockForecastTable`    | Product, current stock, days remaining, risk badge (GREEN/AMBER/RED), sparkline              |
| `CarrierScorecardTable` | On-time rate bar, damage rate, avg cost, composite score badge                               |
| `CapacityForecastChart` | Recharts AreaChart with confidence band + staffing recommendation cards                      |
| `/portal/chat`          | Merchant streaming chat widget: message thread, typing indicator                             |
| `BillingAnomalyPanel`   | On invoice detail: accordion per flagged line, severity, expected vs actual, accept/override |

---

## 17.8 AI Co-Pilot — Feature Reference & User Benefit Map

### Feature 1 — Natural Language Query Engine

**How it works:**

- User types a plain English question in the `/logiq` query bar
- Claude translates it into a scoped SQL `SELECT` query against the account's data
- Results return as a table, bar chart, or line chart depending on the data shape
- Tenant-isolated — Claude is always told `WHERE account_id = '{accountId}'`

**Example questions:**

- "Which merchant had the most orders last week?"
- "Show me all SKUs with less than 10 units in Warehouse A"
- "What was our fulfillment rate in March?"

---

### Feature 2 — Predictive Stockout & Overstock Alerts

**How it works:**

- Runs every 6 hours — calculates 14-day sales velocity per SKU
- If `daysOfStockRemaining < 7` → creates a `STOCKOUT_RISK` insight
- Runs daily at 02:00 UTC — finds stock with zero movement older than `deadStockDays`
- Creates `OVERSTOCK` insight with the estimated carrying cost
- Appears in the `InsightFeed` with severity badge (WARNING / CRITICAL)

---

### Feature 3 — Smart Carrier Recommendation

**How it works:**

- Runs daily at 03:00 UTC — aggregates all historical `CarrierPerformanceLog` records
- Scores every carrier + service combination:
  ```
  score = onTimeRate × 0.5 + (1 - damageRate) × 0.3 + costEfficiency × 0.2
  ```
- Upserts `CarrierScorecard` rows per carrier/service/zone/weight tier
- The **LogIQ Recommended** tag on the packing station rate shop is driven by this score

---

### Feature 4 — Billing Anomaly Detector

**How it works:**

- Triggered automatically before every invoice is finalised
- Passes draft invoice lines + source transaction data to Claude
- Claude scans for 5 anomaly types:

| Anomaly               | What It Catches                                                |
| :-------------------- | :------------------------------------------------------------- |
| `QUANTITY_MISMATCH`   | Pick count doesn't match order line count                      |
| `VACATED_BIN_STORAGE` | Storage charged for a bin that's actually empty                |
| `RATE_MISMATCH`       | Billed rate doesn't match the merchant's contract FeeRule      |
| `DUPLICATE_CHARGE`    | Same order charged twice in one invoice period                 |
| `UNUSUAL_TOTAL`       | Invoice total is >15% above that merchant's historical average |

- Flags stored in `Invoice.anomalyFlags` JSON
- Operator reviews via `BillingAnomalyPanel` before sending the invoice

---

### Feature 5 — Fulfillment Capacity Forecasting

**How it works:**

- Runs daily at 04:00 UTC using exponential smoothing + day-of-week seasonality
- Forecasts order volume for the next 7 days per warehouse
- Calculates `recommendedStaff = ceil(predictedOrders / ORDERS_PER_STAFF_PER_SHIFT)`
- If any forecast day exceeds 90% of historical peak → creates `CAPACITY_WARNING` insight
- Displayed as `CapacityForecastChart` — area chart with confidence bands + staffing cards

---

### Feature 6 — Merchant-Facing AI Chat Widget

**How it works:**

- Streaming chat interface at `/portal/chat` — merchant portal only
- Claude is scoped strictly to that merchant's data (their orders, inventory, invoices only)
- Merchant asks questions in plain English about their own business
- Streaming response — types out in real time

**Example questions a merchant might ask:**

- "How many of my orders shipped this week?"
- "Which of my products are running low?"
- "Why is my invoice higher than last month?"

---

### Feature 7 — Proactive Insight Feed & Daily Digest

**How it works:**

- All AI-generated insights (from Features 2, 3, 5) surface in the `InsightFeed` at `/logiq`
- Insights are severity-badged: INFO / WARNING / CRITICAL
- Every day at 07:00 local time — BullMQ bundles all unacknowledged CRITICAL + WARNING insights from the past 24 hours and emails them as a digest via Resend to `operator_owner`
- Operator acknowledges insights individually — timestamp and user recorded on each

---

## 17.9 Who Benefits Most — Role Benefit Map

### `operator_owner` — All 7 Features

| Feature                | How They Use It                                               |
| :--------------------- | :------------------------------------------------------------ |
| NL Query Engine        | Ask anything across all merchants, warehouses, and carriers   |
| Stockout / Overstock   | Full visibility across all SKUs and all merchants             |
| Carrier Recommendation | Optimise shipping costs account-wide                          |
| Billing Anomaly        | Protect revenue — catch billing errors before invoices go out |
| Capacity Forecasting   | Plan staffing levels across all warehouses                    |
| Insight Feed + Digest  | Daily email summary of everything requiring attention         |
| Merchant Chat          | Can support merchants directly if needed                      |

> **Highest ROI user. The AI acts as their operations director — surfacing problems before they become crises.**

---

### `warehouse_manager` — 4 Features

| Feature              | How They Use It                                                     |
| :------------------- | :------------------------------------------------------------------ |
| NL Query Engine      | Query their warehouse's inventory and order data                    |
| Stockout / Overstock | Act on low stock alerts scoped to their warehouse                   |
| Capacity Forecasting | **Most critical** — tells them how many staff to schedule each day  |
| Insight Feed         | See CAPACITY_WARNING and STOCKOUT_RISK for their assigned warehouse |

> **Capacity Forecasting alone is a daily operational tool for this role — directly affects staffing decisions.**

---

### `merchant_owner` / `merchant_user` — 2 Features

| Feature              | How They Use It                                                            |
| :------------------- | :------------------------------------------------------------------------- |
| Merchant Chat Widget | Ask questions about their orders, inventory, and invoices in plain English |
| Billing Anomaly      | Indirectly benefits — operator catches errors before the invoice is sent   |

> **The chat widget makes the merchant portal feel intelligent rather than a passive read-only view. Merchants get self-service answers without raising support tickets.**

---

### `warehouse_staff` — 0 Features

The AI layer is not surfaced to floor staff. Their interfaces (pick, pack, receive) are action-focused with no AI overlay.

---

### Summary

| Role                | Features | Primary Value                                |
| :------------------ | :------- | :------------------------------------------- |
| `operator_owner`    | All 7    | Operations intelligence + revenue protection |
| `warehouse_manager` | 4        | Staff planning + inventory alerts            |
| `merchant_owner`    | 2        | Self-service data questions + fair billing   |
| `warehouse_staff`   | 0        | Not applicable — floor operations only       |

> The AI is **operator-first by design** — it reads across all modules and all merchants to give the 3PL operator a complete picture of their business. Merchants get a lighter, scoped version through the chat widget.

---

# Section 18 — Cross-Cutting Concerns

Apply these patterns consistently across every module.

## 18.1 Error Handling

```typescript
// Standard tRPC error codes:
// UNAUTHORIZED — not authenticated
// FORBIDDEN — wrong role or plan limit exceeded
// NOT_FOUND — resource missing or wrong tenant
// CONFLICT — duplicate (e.g. duplicate SKU)
// PRECONDITION_FAILED — business rule violation (insufficient stock)
// INTERNAL_SERVER_ERROR — unexpected (log to Sentry, never expose)

// Wrap all Prisma calls:
try {
  await db.product.create({ data });
} catch (e: any) {
  if (e.code === "P2002")
    throw new TRPCError({
      code: "CONFLICT",
      message: "A product with this SKU already exists.",
    });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
```

## 18.2 Pagination

```typescript
// Cursor-based pagination for all list procedures:
const paginationInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(25),
});

// Return: { items: T[], nextCursor: string | null, total: number }
```

## 18.3 Money Handling

```typescript
// Store all money as integers (cents). Never use floats.
export const formatCents = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );

const dollarsToCents = (d: string) => Math.round(parseFloat(d) * 100);
```

## 18.4 Security Checklist

- Every tRPC procedure verifies better-auth session before any DB query.
- Every DB query includes `accountId` in WHERE clause — never trust client-supplied IDs.
- PostgreSQL Row Level Security on all tables as defence-in-depth.
- API keys stored as bcrypt hashes — raw key shown once on creation only.
- Shopify, TikTok Shop, and EasyPost webhooks verified via HMAC signature before processing.
- S3 label URLs served as presigned URLs with 1-hour expiry — never public.
- `ANTHROPIC_API_KEY` server-side only — never exposed to the browser.
- Integration OAuth tokens AES-256 encrypted in `Integration.credentials` JSON.
- `BETTER_AUTH_SECRET` and all OAuth credentials in env vars only.
- Polar webhook signature verified via `@polar-sh/nextjs` Webhooks handler.
- Rate limiting on all public API routes via Upstash Redis sliding window.

## 18.5 Testing Requirements

| Type                 | Tool                 | Coverage                                                                   |
| :------------------- | :------------------- | :------------------------------------------------------------------------- |
| Unit — service layer | Vitest + mock Prisma | All business logic: negative stock, over-receive, routing, DIM weight      |
| Integration — tRPC   | Vitest + test DB     | All procedures: happy path + error cases + role checks + plan limits       |
| E2E — critical flows | Playwright           | Order → pick → pack → label; Cycle count; Invoice generate; Polar checkout |
| Type checking        | TypeScript strict    | Zero errors on build                                                       |
| Linting              | ESLint + Prettier    | Pre-commit via Husky + lint-staged                                         |

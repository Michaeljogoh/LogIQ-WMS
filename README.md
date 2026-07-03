# LogIQ WMS

**The intelligent warehouse operating system for modern 3PLs**

LogIQ WMS is a unified platform that combines a full-featured Warehouse Management System (WMS) with an embedded AI co-pilot, **LogIQ**. It targets third-party logistics providers (3PLs) and e-commerce brands that need enterprise-grade logistics tooling plus an intelligent layer that predicts problems, answers questions in plain English, and automates decisions that slow operators down.

Where traditional WMS platforms stop at capturing operational data, LogIQ WMS is designed so every module feeds the LogIQ intelligence engine, which continuously monitors warehouse operations and surfaces what matters—before operators go looking for it.

---

## How the WMS and LogIQ fit together

LogIQ WMS is not a WMS with AI bolted on; the intelligence layer is part of the architecture from day one.

| WMS layer                                | LogIQ (AI layer)                                      |
| ----------------------------------------- | ----------------------------------------------------- |
| Inventory tracked in real time per bin   | Predicts stockouts before they happen                 |
| Orders ingested and fulfilled            | Forecasts daily volume and recommends staffing        |
| Rate shop selects cheapest carrier       | Learns actual performance and recommends best carrier |
| Invoices generated per merchant contract | Audits invoices for anomalies before they go out      |
| Merchants view orders and inventory      | Answers merchant questions via embedded AI chat       |
| Operational data in PostgreSQL           | Queries it in natural language on demand              |

---

## Target users

| User                | Role                                       | Primary needs                                                     |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| **3PL operator**    | Runs the warehouse across merchant clients | Full ops control, AI insights, billing automation, SLA visibility |
| **Warehouse staff** | Pickers, packers, receivers                | Fast mobile workflows, barcode scanning, clear task queues        |
| **Merchant**        | Brand with inventory at the 3PL            | Inventory and order visibility, AI chat, self-service invoices    |
| **3PL admin**       | Finance / ops leadership                   | Billing audit, anomaly detection, analytics, forecasting          |

---

## Core modules — WMS layer

### 1. Inventory management

- Real-time stock per SKU, bin, and warehouse zone; multi-location support
- Lot and serial tracking with expiry; full movement audit trail (timestamp, user, reason)
- Low-stock thresholds per SKU per merchant; dead-stock flags (30 / 60 / 90 days)
- Cycle count with mobile scan-to-count and discrepancy reconciliation
- Strong multi-merchant data isolation

### 2. Inbound — purchase orders and receiving

- Purchase orders to suppliers; ASN support
- Receiving: scan on arrival, match to PO, flag discrepancies
- Smart putaway suggestions from zone rules; work orders for kitting / assembly
- Supplier directory with on-time delivery tracking

### 3. Outbound — pick, pack, and ship

- Order ingestion from major channels (Shopify, WooCommerce, Amazon, TikTok Shop, with BigCommerce, Etsy, and eBay connectors in progress)
- Routing rules (warehouse, carrier, SLA); pick strategies (single, batch, zone, wave)
- Mobile pick-and-pack PWA with barcode confirmation; packing station UI (weight, dims, packaging, customs)
- Rate shopping via [EasyPost](https://www.easypost.com/) (USPS, FedEx, UPS, DHL) with tags like Cheapest / Fastest / Best Value / LogIQ recommended
- Cutoff rules per merchant; label generation with thermal (ZPL) support; carrier webhooks for milestones
- Returns / RMA: receive, inspect, restock or disposal

### 4. MerchantOS — merchant portal

- Self-serve onboarding, channel connections, SKU mapping
- Isolated merchant dashboard; fulfillment delegation to the 3PL on-platform
- Contract-based fees (storage, pick, receiving, packing, label, special handling)
- Invoice approval workflow; SLA tracking with breach alerts

### 5. Analytics and reporting

- Operations, inventory health, merchant performance, carrier cost, receiving reports
- Custom report builder; export to CSV and PDF

### 6. Integrations hub

- Sales channels, carriers (EasyPost), accounting (QuickBooks Online, Xero), notifications (email via Postmark, Slack, in-app), and a developer surface (REST API, API keys, outbound webhooks via Svix)

---

## Core modules — LogIQ (AI layer)

### Natural language query engine

Operators and merchants ask questions in plain English. LogIQ uses **Google Gemini** with tenant-scoped warehouse context, turns requests into safe, scoped database access against live PostgreSQL, and returns readable answers with optional chart suggestions.

Example questions:

- Which merchants had SLA breaches this week and why?
- What is my slowest-moving SKU in bin A-12 over 60 days?
- Show Shopify orders past due that have not shipped today
- Which carriers cost the most per Zone 4 shipment this month?

### Predictive stockout and overstock alerts

- Rolling average daily velocity per SKU per merchant
- Days-of-stock remaining with tiered alerts (e.g. warning / critical / urgent)
- Seasonal adjustment for promotional or calendar-driven demand
- Overstock flags with carrying-cost context and recommended actions (reorder, markdown, return, reallocate)

---

## Tech stack

| Area              | Choice                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| App framework     | [Next.js](https://nextjs.org/) (App Router)                                                              |
| Language          | TypeScript                                                                                               |
| API / types       | [tRPC](https://trpc.io/)                                                                                 |
| Database          | PostgreSQL via [Prisma](https://www.prisma.io/)                                                          |
| Auth              | [Better Auth](https://www.better-auth.com/) (email/password, OAuth, 2FA)                                 |
| UI                | React, [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/)-style components |
| Background jobs   | [BullMQ](https://docs.bullmq.io/) + Redis                                                                |
| Billing           | [Polar](https://polar.sh/)                                                                               |
| Email             | [Postmark](https://postmarkapp.com/) + [react-email](https://react.email/)                               |
| File storage      | AWS S3                                                                                                    |
| Error monitoring  | [Sentry](https://sentry.io/)                                                                              |
| Lint / format     | [Biome](https://biomejs.dev/)                                                                             |
| AI (product)      | Google Gemini API (LogIQ)                                                                                 |

---

## Getting started

### Prerequisites

- **Node.js** (LTS recommended)
- **PostgreSQL** for Prisma
- **Redis** for background jobs (notifications, integration sync, LogIQ digests)

### Install

```bash
npm install
```

### Environment

Copy `.env` and configure the variables for your setup. Key groups:

| Group             | Variables                                                                 |
| ----------------- | -------------------------------------------------------------------------- |
| Database          | `DATABASE_URL`, `DIRECT_URL`                                              |
| App               | `NEXT_PUBLIC_APP_URL`                                                     |
| Auth              | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`        |
| AI (LogIQ)        | `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL`                            |
| Billing           | `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`                              |
| Storage           | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION` |
| Email             | `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM`                                  |
| Carriers          | `EASYPOST_API_KEY`, `EASYPOST_TEST_KEY`                                   |
| Jobs              | `REDIS_URL`                                                               |
| Webhooks          | `SVIX_API_KEY`                                                            |
| Marketplaces      | `SHOPIFY_API_KEY/SECRET`, `BIGCOMMERCE_CLIENT_ID/SECRET`, `ETSY_CLIENT_ID/SECRET`, `TIKTOK_SHOP_APP_KEY/SECRET`, `EBAY_CLIENT_ID/SECRET` |
| Monitoring        | `SENTRY_DSN`                                                              |

Apply schema to your database when you are ready:

```bash
npm run db:migrate
# or, for prototyping without migrations:
npm run db:push
```

Optionally seed demo data:

```bash
npm run db:seed:demo
```

### Develop

```bash
npm run dev
```

Open [http://localhost:3008](http://localhost:3008).

### Other scripts

| Script                | Purpose                                         |
| --------------------- | ------------------------------------------------ |
| `npm run build`       | `prisma generate` then production Next.js build |
| `npm run start`       | Run production server                           |
| `npm run lint`        | Biome check                                     |
| `npm run format`      | Biome format (write)                            |
| `npm run db:generate` | Regenerate Prisma Client                        |
| `npm run db:studio`   | Open Prisma Studio                              |
| `npm run db:seed:demo`  | Seed the database with demo data              |
| `npm run db:seed:reset` | Reset demo data                               |

---

## Project layout (high level)

- `src/app/` — Next.js App Router routes and layouts (dashboard, portal, platform, onboarding, and public landing page)
- `src/app/api/trpc/` — tRPC HTTP handler
- `src/app/trpc/` — tRPC routers, server/client helpers, React Query wiring
- `src/components/` — Shared UI, including dashboard, landing, brand, and LogIQ components
- `src/server/` — tRPC routers, auth, AI (LogIQ) query engine, background jobs, and third-party integrations
- `src/emails/` — React Email templates sent via Postmark
- `src/config/` — Sidebar, permissions, and other app configuration
- `prisma/` — Prisma schema, migrations, and demo seed script

---

## Seed users

LogIQ WMS ships with two ways to get pre-built accounts for local development: a **platform admin** (internal ops console) and an optional **demo tenant** (full 3PL + merchant data).

### Platform admin

Created automatically on server start when `PLATFORM_ADMIN_PASSWORD` is set in `.env`. Configure these variables:

| Variable | Default |
| -------- | ------- |
| `PLATFORM_ADMIN_EMAIL` | `admin@logiq.internal` |
| `PLATFORM_ADMIN_PASSWORD` | *(required — set in `.env`)* |
| `PLATFORM_ADMIN_NAME` | `LogIQ Platform Admin` |

**How to use**

1. Set `PLATFORM_ADMIN_PASSWORD` in `.env`.
2. Run `npm run dev` (or `npm run start`).
3. Open [http://localhost:3008/sign-in](http://localhost:3008/sign-in) and sign in with the platform admin email and password.
4. You are redirected to `/platform/dashboard` (accounts, billing, support, and platform-wide tools).

### Demo tenant

Seeds a fictional 3PL (`demo-3pl`) with warehouses, merchants, orders, inventory, billing, and portal data. All demo users share the password **`Demo123!`**.

| Role | Email | After sign-in |
| ---- | ----- | ------------- |
| 3PL operator (owner) | `demo@logiq.internal` | `/dashboard` |
| Warehouse manager | `manager@demo.logiq` | `/dashboard` |
| Warehouse staff | `staff1@demo.logiq` | `/dashboard` |
| Warehouse staff | `staff2@demo.logiq` | `/dashboard` |
| Merchant owner (Apex Sportswear) | `merchant@apexsportswear.demo` | `/portal/dashboard` |
| Merchant user (Apex Sportswear) | `user@apexsportswear.demo` | `/portal/dashboard` |

**How to use**

1. Apply the database schema (`npm run db:migrate` or `npm run db:push`).
2. Seed demo data:

   ```bash
   npm run db:seed:demo
   ```

3. Sign in at [http://localhost:3008/sign-in](http://localhost:3008/sign-in) with any email above and `Demo123!`.
4. To wipe and re-seed the demo tenant:

   ```bash
   npm run db:seed:reset
   npm run db:seed:demo
   ```

> **Note:** Demo seed and reset are blocked in production unless `ALLOW_DEMO_SEED=true` is set. The platform admin seed runs whenever the server starts and the password env var is present.

---

## License

Private / unlicensed unless otherwise specified by the repository owner.

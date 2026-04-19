# ShipCore

**The intelligent warehouse operating system for modern 3PLs**

ShipCore is a unified platform that combines a full-featured Warehouse Management System (WMS) with an embedded AI co-pilot, **LogIQ**. It targets third-party logistics providers (3PLs) and e-commerce brands that need enterprise-grade logistics tooling plus an intelligent layer that predicts problems, answers questions in plain English, and automates decisions that slow operators down.

Where traditional WMS platforms stop at capturing operational data, ShipCore is designed so every module feeds the LogIQ intelligence engine, which continuously monitors warehouse operations and surfaces what matters—before operators go looking for it.

> **Product Requirements:** This README reflects **ShipCore PRD v1.0 (April 2026)**—product scope, users, and modules. The codebase is an active implementation of that vision.

---

## How ShipCore and LogIQ fit together

ShipCore is not a WMS with AI bolted on; the intelligence layer is part of the architecture from day one.

| WMS layer (ShipCore)                     | AI layer (LogIQ)                                      |
| ---------------------------------------- | ----------------------------------------------------- |
| Inventory tracked in real time per bin   | Predicts stockouts before they happen                 |
| Orders ingested and fulfilled            | Forecasts daily volume and recommends staffing        |
| Rate shop selects cheapest carrier       | Learns actual performance and recommends best carrier |
| Invoices generated per merchant contract | Audits invoices for anomalies before they go out      |
| Merchants view orders and inventory      | Answers merchant questions via embedded AI chat       |
| Operational data in PostgreSQL           | Queries it in natural language on demand              |

---

## Target users

| User                | Role                                       | Primary needs                                                     |
| ------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
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

- Order ingestion from major channels (Shopify, WooCommerce, Amazon, eBay, TikTok Shop, and others per roadmap)
- Routing rules (warehouse, carrier, SLA); pick strategies (single, batch, zone, wave)
- Mobile pick-and-pack PWA with barcode confirmation; packing station UI (weight, dims, packaging, customs)
- Rate shopping (e.g. EasyPost: USPS, FedEx, UPS, DHL) with tags like Cheapest / Fastest / Best Value / LogIQ recommended
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

- Sales channels, carriers (EasyPost primary, Shippo fallback where applicable), accounting (QuickBooks Online, Xero), notifications (email, Slack, in-app), and a developer surface (REST API, API keys, outbound webhooks)

---

## Core modules — LogIQ (AI layer)

### Natural language query engine

Operators and merchants ask questions in plain English. LogIQ uses **Anthropic Claude** with tenant-scoped warehouse context, turns requests into safe, scoped database access against live PostgreSQL, and returns readable answers with optional chart suggestions.

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

| Area          | Choice                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| App framework | [Next.js](https://nextjs.org/) (App Router)                                                              |
| Language      | TypeScript                                                                                               |
| API / types   | [tRPC](https://trpc.io/)                                                                                 |
| Database      | PostgreSQL via [Prisma](https://www.prisma.io/)                                                          |
| UI            | React, [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/)-style components |
| Lint / format | [Biome](https://biomejs.dev/)                                                                            |
| AI (product)  | Anthropic Claude API (LogIQ)                                                                             |

---

## Getting started

### Prerequisites

- **Node.js** (LTS recommended)
- **PostgreSQL** for Prisma

### Install

```bash
npm install
```

### Environment

Configure a PostgreSQL connection string for Prisma (variable name depends on your Prisma setup; commonly `DATABASE_URL` in `.env`). Apply schema to your database when you are ready:

```bash
npm run db:migrate
# or, for prototyping without migrations:
npm run db:push
```

### Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other scripts

| Script                | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| `npm run build`       | `prisma generate` then production Next.js build |
| `npm run start`       | Run production server                           |
| `npm run lint`        | Biome check                                     |
| `npm run format`      | Biome format (write)                            |
| `npm run db:generate` | Regenerate Prisma Client                        |
| `npm run db:studio`   | Open Prisma Studio                              |

---

## Project layout (high level)

- `src/app/` — Next.js App Router routes and layouts (including dashboard shell)
- `src/app/api/trpc/` — tRPC HTTP handler
- `src/app/trpc/` — tRPC routers, server/client helpers, React Query wiring
- `src/components/` — Shared UI (including dashboard components)
- `prisma/` — Prisma schema and migrations

---

## Confidentiality

The ShipCore PRD referenced here is **confidential — for review purposes only**. Treat product details, roadmap, and integration plans accordingly when sharing outside your organization.

---

## License

Private / unlicensed unless otherwise specified by the repository owner.

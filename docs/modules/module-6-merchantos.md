# Module 6 - MerchantOS (Merchant Portal + Billing)

## Scope Implemented

This module adds merchant-facing dashboard/settings/billing screens, merchant contract management, invoice generation workflow, and marketplace integration management.

## Files Added / Updated

- `prisma/schema.prisma`
  - Added models:
    - `MerchantContract`
    - `FeeRule`
    - `SLARule`
    - `Invoice`
    - `InvoiceLine`
    - `Integration`
  - Added enums:
    - `PaymentPeriod`
    - `FeeType`
    - `InvoiceStatus`
    - `IntegrationType`
    - `IntegrationStatus`
  - Added model relations for contracts/invoices/integrations to:
    - `LogiqAccount`
    - `Merchant`

- `src/server/api/routers/merchant.ts`
  - Added:
    - `merchant.listWithMetrics`
    - `merchant.portalDashboard`
    - `merchant.getContract`
    - `merchant.upsertContract`

- `src/server/api/routers/invoice.ts`
  - Implemented:
    - `invoice.listByMerchant`
    - `invoice.getById`
    - `invoice.generate`
    - `invoice.dispute`

- `src/server/api/routers/integration.ts`
  - Implemented:
    - `integration.list`
    - `integration.getOAuthUrl`
    - `integration.handleCallback`
    - `integration.disconnect`
    - `integration.syncNow`

- `src/app/trpc/routers/_app.ts`
  - Registered:
    - `invoice`
    - `integration`

- Operator pages implemented:
  - `src/app/(dashboard)/merchants/page.tsx`
  - `src/app/(dashboard)/merchants/[id]/contract/page.tsx`
  - `src/app/(dashboard)/merchants/[id]/invoices/[invoiceId]/page.tsx`

- Merchant portal pages implemented:
  - `src/app/(portal)/portal/dashboard/page.tsx`
  - `src/app/(portal)/portal/dashboard/portal-dashboard-client.tsx`
  - `src/app/(portal)/portal/billing/page.tsx`
  - `src/app/(portal)/portal/settings/page.tsx`
  - `src/app/(portal)/portal/settings/integrations/page.tsx`
  - `src/app/(portal)/portal/settings/integrations/[platform]/connect/page.tsx`

## Core Logic Implemented

- Merchant contract configuration:
  - upsert contract by merchant
  - replace fee rules + SLA rules in a transaction

- Invoice generation:
  - invoice number format `INV-{YYYY}-{seq}` using transaction lock + raw SQL
  - line-level billing entries generated from fee rules and period activity
  - totals rolled up into `Invoice.totalCents`
  - review state set to `PENDING_REVIEW`
  - anomaly payload stored in `Invoice.anomalyFlags`

- Invoice dispute flow:
  - dispute mutation moves invoice to `DISPUTED`
  - stores reason payload in anomaly/dispute metadata
  - persists real dispute audit entries in `InvoiceDispute`
  - dispute history is returned on invoice detail queries

- Invoice PDF generation:
  - invoice PDFs are rendered from generated lines
  - PDFs are uploaded to S3 and linked in `Invoice.pdfUrl`

- Merchant scoping hardening:
  - merchant users are restricted to their own merchant context in invoice endpoints
  - merchant-only invoice listing uses session merchant context (`invoice.listMine`)

- SLA scoring:
  - merchant SLA score is computed from due-date backed orders
  - score reflects on-time fulfillment behavior instead of a static constant

- Integrations management:
  - merchant-level integration list
  - OAuth URL generation
  - callback persistence
  - manual sync status updates
  - disconnect flow

## UI Workflow Highlights

- `/merchants`
  - merchant cards with order count, inventory value, SLA score, latest invoice
- `/merchants/[id]/contract`
  - contract editor with payment period + basic fee/SLA rule editing
- `/merchants/[id]/invoices/[invoiceId]`
  - invoice details, line breakdown, anomaly view, dispute submission
- `/portal/dashboard`
  - merchant summary cards (open orders, low stock, recent shipments, latest invoice)
- `/portal/billing`
  - invoice history and dispute form
- `/portal/settings`
  - contact + notification preference UI
- `/portal/settings/integrations`
  - platform connect/sync/disconnect management
- `/portal/settings/integrations/[platform]/connect`
  - OAuth entry route + callback completion

## Validation Completed

- Prisma client generation successful.
- TypeScript checks successful.
- No linter diagnostics in touched files.

## Hardening Completed

- Stricter merchant-role scoping for merchant invoice access.
- Richer SLA score computation in merchant metrics.
- Invoice PDF generation and persisted dispute audit trail.

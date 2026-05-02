# Module 14 — Platform Billing via Polar

## Scope

Implemented Polar-backed **operator (3PL) subscription** flows: checkout session creation, customer portal deep link, subscription webhooks that sync `LogiqAccount.plan` and `polarCustomerId`, usage-style **event ingestion** for orders/labels/overage, **plan limits** enforcement (warehouses and merchants hard caps; monthly order soft cap with overage metering), and billing UI.

No new Prisma models: billing uses existing `LogiqAccount.plan`, `LogiqAccount.polarCustomerId`, and enum `Plan` (`STARTER`, `GROWTH`, `ENTERPRISE`).

Deferred / notes:

- Metering uses **`polar.events.ingest`** (Polar’s current events API), not the older `meters.ingest` snippet from the spec text. Configure corresponding meters/event names in the Polar dashboard to match: `overage_order`, `order_fulfilled`, `label_purchased`.
- Usage events require a linked **`polarCustomerId`** (set after successful checkout / webhook). Until then, ingest calls no-op safely.
- `getInvoices` lists the first page of Polar **orders** for the customer and attaches invoice PDF URLs when `isInvoiceGenerated` and `orders.invoice` succeeds.

## Database

No migration dedicated to module 14; fields live on `LogiqAccount` from earlier schema (`plan`, `polarCustomerId`).

## Server modules

- `src/server/billing/polar-config.ts` — `PLAN_LIMITS`, `getPolar()`, `polarServer()`, product ID mapping from env, `planForPolarProductId`.
- `src/server/billing/plan-limits.ts` — `limitsForPlan`, `assertWithinWarehouseLimit`, `assertWithinMerchantLimit`, `shouldMeterOrderOverage`.
- `src/server/billing/usage-ingest.ts` — `scheduleOverageOrderMeter`, `scheduleOrderFulfilledAndLabelPurchased` (async, logs errors).
- `src/server/billing/subscription-sync.ts` — `applyPolarSubscriptionToAccount`, `applyPolarSubscriptionCancelled` (webhook handlers).

## API

Router: `billing` (registered on `appRouter`). Procedures require **threepl account owner** or **platform admin** (see `requireRole` in router).

- `getSubscription` — local account row + optional Polar `subscriptions.list` when token and `polarCustomerId` exist.
- `getUsage` — calendar month counts: orders (non-`CANCELLED`), shipments/labels (non-`VOIDED`); returns caps with `null` meaning unlimited; `enterpriseProductConfigured` if `POLAR_PRODUCT_ENTERPRISE_ID` is set.
- `createCheckout` — `{ targetPlan }` — `checkouts.create` with `externalCustomerId = accountId`, `metadata` / `customerMetadata` carrying `accountId`; returns `checkoutUrl`.
- `getPortalUrl` — `customerSessions.create` with `externalCustomerId = accountId`; returns `portalUrl` (caller redirects).
- `getInvoices` — Polar orders + PDF link per row when available.

## Webhook

- **Route:** `POST /api/polar`
- Verifies payload with `@polar-sh/sdk/webhooks` `validateEvent` and `POLAR_WEBHOOK_SECRET`.
- **Handled types:** `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.uncanceled` → upsert plan + `polarCustomerId`; `subscription.canceled`, `subscription.revoked` → set plan to `STARTER`.

## Plan enforcement & metering (call sites)

- **Hard limits:** `warehouse.create`, `merchant.create` — throw `FORBIDDEN` when at cap.
- **Soft cap / overage:** before inserting a new `Order`, `shouldMeterOrderOverage` runs inside the same transaction; if true, after commit `scheduleOverageOrderMeter` runs for: `order.create` (tRPC), integration hub order upsert (new rows only), split child orders in `route-order`, REST `POST /api/v1/orders`.
- **Fulfillment metering:** after successful `shipment.buyLabel`, `scheduleOrderFulfilledAndLabelPurchased` (order fulfilled + label purchased events).

## UI

- `/settings/billing` — plan summary, usage meters, customer portal button, invoice table.
- `/settings/billing/upgrade` — plan cards → `createCheckout` (Enterprise checkout only if enterprise product env is set).
- `/onboarding/plan` — same checkout entry; linked from onboarding wizard.

## Configuration

| Variable                      | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `POLAR_ACCESS_TOKEN`          | Organization access token for `@polar-sh/sdk`            |
| `POLAR_WEBHOOK_SECRET`        | Webhook signing secret                                   |
| `POLAR_SERVER`                | Optional: `sandbox` or `production` (default production) |
| `POLAR_PRODUCT_STARTER_ID`    | Polar product UUID for Starter                           |
| `POLAR_PRODUCT_GROWTH_ID`     | Polar product UUID for Growth                            |
| `POLAR_PRODUCT_ENTERPRISE_ID` | Optional Polar product UUID for Enterprise               |
| `NEXT_PUBLIC_APP_URL`         | Base URL for checkout success/return links               |

Webhook URL in Polar should point to: `{NEXT_PUBLIC_APP_URL}/api/polar` (or your deployed equivalent).

## How to verify

1. Set env vars (at minimum token + product IDs + app URL for redirects).
2. Configure Polar webhook to `POST` your `/api/polar` endpoint with the same secret.
3. As an operator owner, open `/settings/billing/upgrade`, complete checkout in sandbox; confirm `LogiqAccount` updates via webhook (plan + `polarCustomerId`).
4. Use **Customer portal** on `/settings/billing` and confirm redirect.
5. Create orders beyond the Starter monthly cap and confirm `overage_order` ingest attempts (watch server logs if Polar returns errors).
6. Buy a shipping label and confirm `order_fulfilled` / `label_purchased` ingest attempts when `polarCustomerId` is set.

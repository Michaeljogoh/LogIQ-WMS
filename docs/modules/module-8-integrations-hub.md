# Module 8 - Integrations Hub

## Scope Implemented

This module adds the Integrations Hub foundation: connector management, encrypted credential handling, order sync orchestration, webhook ingestion, outbound webhook dispatch, tracking pushback pipeline, and a public REST API surface protected by API keys with rate limiting.

## Files Added / Updated

- `prisma/schema.prisma`
  - Added models:
    - `ApiKey`
    - `WebhookEndpoint`
    - `IntegrationSyncLog`
  - Expanded enum:
    - `IntegrationType` now includes `EASYPOST`, `QUICKBOOKS`
  - Added relations:
    - `LogiqAccount.apiKeys`
    - `LogiqAccount.webhookEndpoints`
    - `LogiqAccount.integrationSyncLogs`
    - `Integration.syncLogs`

- `src/lib/secure-json.ts`
  - Added AES-256-GCM JSON encryption/decryption helpers:
    - `encryptJson`
    - `decryptJson`

- `src/server/integrations/connector-common.ts`
  - Added shared connector helpers:
    - OAuth URL builder
    - token exchange stub response parser
    - sync payload shape + stub order fetcher

- `src/server/integrations/normaliser.ts`
  - Added `NormalisedOrder` contract
  - Added `normaliseOrder()` to map external payloads to internal order shape
  - Retained webhook payload normalization helper

- `src/server/integrations/{shopify,woocommerce,bigcommerce,etsy,tiktok-shop,ebay}.ts`
  - Replaced stubs with connector objects implementing:
    - OAuth URL generation
    - code exchange handler
    - order fetch hook
    - tracking pushback hook

- `src/server/integrations/hub.ts`
  - Added Integrations Hub orchestration:
    - `getIntegrationOAuthUrl`
    - `exchangeIntegrationCode`
    - `syncIntegrationOrders`
    - `pushTrackingToIntegration`
  - Added upsert flow into `Order` + `OrderLine` from normalised payloads
  - Added sync log writes (`IntegrationSyncLog`)
  - Added outbound event dispatch for created orders

- `src/server/integrations/svix-events.ts`
  - Added outbound webhook event dispatcher:
    - HMAC-signed payload delivery to configured endpoints
    - supports Module 8 event names

- `src/server/api/routers/integration.ts`
  - Implemented/extended:
    - `integration.list`
    - `integration.getOAuthUrl`
    - `integration.handleCallback`
    - `integration.disconnect`
    - `integration.syncNow`
    - `integration.getSyncLog`
    - `integration.createApiKey`
    - `integration.listApiKeys`
    - `integration.revokeApiKey`
  - Added encrypted credential persistence in callback flow
  - Added sync log retrieval and API key management endpoints

- `src/server/jobs/queues.ts`
  - Added `IntegrationSyncJobPayload` type

- `src/server/jobs/workers/integration-sync.worker.ts`
  - Implemented sync worker:
    - poll/manual/webhook sync path
    - tracking pushback path

- `src/server/jobs/integration-sync.ts`
  - Added in-process dispatcher helpers:
    - `enqueueIntegrationSyncJob`
    - `runScheduledIntegrationPolls`

- `src/app/api/webhooks/_integration.ts`
  - Added shared webhook ingestion helper for marketplace providers

- `src/app/api/webhooks/{shopify,woocommerce,bigcommerce,etsy,tiktok-shop,ebay}/route.ts`
  - Implemented webhook entry routes using shared integration handler

- `src/app/api/webhooks/easypost/route.ts`
  - Implemented EasyPost tracking webhook handler:
    - tracking event ingestion
    - shipment status update
    - outbound event dispatch for delivered/exception

- `src/app/api/v1/_lib.ts`
  - Added API key auth/rate-limit middleware utilities:
    - bearer key lookup and scope checks
    - 100 req/min sliding-window limiter (Redis with in-memory fallback)
    - standard REST error wrapper

- `src/app/api/v1/orders/route.ts`
  - `GET /api/v1/orders`
  - `POST /api/v1/orders`

- `src/app/api/v1/orders/[id]/route.ts`
  - `GET /api/v1/orders/{id}`

- `src/app/api/v1/inventory/products/route.ts`
  - `GET /api/v1/inventory/products`

- `src/app/api/v1/inventory/products/[sku]/stock/route.ts`
  - `GET /api/v1/inventory/products/{sku}/stock`

- `src/app/api/v1/shipments/[id]/tracking/route.ts`
  - `GET /api/v1/shipments/{id}/tracking`

- `src/app/api/v1/webhooks/route.ts`
  - `GET /api/v1/webhooks`
  - `POST /api/v1/webhooks`

- `src/server/api/routers/shipment.ts`
  - Extended label purchase flow to:
    - trigger integration tracking pushback jobs
    - emit `logiqwms.shipment.label_created` outbound webhook event

- Portal UI updates:
  - `src/app/(portal)/portal/settings/integrations/page.tsx`
    - added recent sync log panel
  - `src/app/(portal)/portal/settings/integrations/[platform]/connect/page.tsx`
    - added WooCommerce manual credential fields

## Integrations Procedures Implemented

- `integration.list`
  - Lists merchant integrations with status + last sync metadata

- `integration.getOAuthUrl`
  - Generates provider-specific OAuth URL and encoded state payload

- `integration.handleCallback`
  - Exchanges auth code (or accepts WooCommerce manual credentials)
  - Encrypts tokens/secrets and stores in `Integration.credentials`
  - Persists integration metadata + sync timestamps

- `integration.disconnect`
  - Deletes integration row and records sync-log disconnect event

- `integration.syncNow`
  - Runs immediate sync through hub orchestrator
  - Upserts normalized orders and writes sync logs

- `integration.getSyncLog`
  - Returns last 50 sync events with counters and error payloads

## API Key Management Implemented

- `integration.createApiKey`
  - Generates one-time raw key (`lq_*`)
  - Stores SHA-256 hash and key prefix
  - Persists scopes and optional expiry

- `integration.listApiKeys`
  - Returns account API key metadata (no raw secret)

- `integration.revokeApiKey`
  - Deactivates existing API key

## Public REST API Implemented

- `/api/v1/orders`
  - `GET` list orders
  - `POST` create order

- `/api/v1/orders/{id}`
  - `GET` order detail with lines and shipments

- `/api/v1/inventory/products`
  - `GET` products with stock summary

- `/api/v1/inventory/products/{sku}/stock`
  - `GET` stock breakdown for a SKU

- `/api/v1/shipments/{id}/tracking`
  - `GET` tracking timeline for shipment

- `/api/v1/webhooks`
  - `GET` list outbound webhook endpoints
  - `POST` register/update webhook endpoint

## Security & Isolation Implemented

- Integration credentials are encrypted using AES-256-GCM before persistence.
- REST API uses Bearer API keys with:
  - hash lookup (`ApiKey.keyHash`)
  - scope validation
  - active/expiry checks
- Rate limiting enforced at 100 req/min per key (Redis-backed with fallback).
- Tenant isolation retained across integration/order/webhook DB access using `accountId`.

## Sync & Event Flow Implemented

- Webhook-first ingestion for Shopify/BigCommerce/WooCommerce and available routes for all marketplaces.
- Poll/manual sync orchestration path via integration worker helpers.
- Order normalization ensures external payloads are transformed into internal unified order shape.
- Tracking pushback hook fires when labels are purchased.
- Outbound event dispatch implemented for:
  - `logiqwms.order.created`
  - `logiqwms.shipment.label_created`
  - `logiqwms.shipment.delivered`
  - `logiqwms.shipment.exception`

## Validation Completed

- Production build (`pnpm build`) successful after Module 8 implementation.
- TypeScript checks successful.
- No linter diagnostics in touched Module 8 files via `ReadLints`.

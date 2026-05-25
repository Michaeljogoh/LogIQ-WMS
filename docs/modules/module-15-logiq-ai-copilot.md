# Module 15 — LogIQ AI Co-Pilot Layer

## Scope

**Shipped**

- Natural-language query path: Claude generates tenant-scoped PostgreSQL `SELECT` queries, validated before execution; results support table / bar / line visualization on `/logiq`.
- Query audit log: `LogIQQuery` rows per operator query (text, explanation, chart type, row count, errors).
- Insight model and feed: `LogIQInsight` with dedupe keys, severities, optional `merchantId` / `warehouseId`, acknowledge flow.
- Stock-out forecasting: `StockForecast` upserts from outbound velocity; drives risk badges and sparklines in UI.
- Background scans (invoked via `logiqQueue`, processed inline like `notifyQueue`):
  - stock-out risk (`logiq.stockoutScan`, ~6h cadence in spec; run on demand from UI or your scheduler),
  - overstock (`logiq.overstockScan`, daily in spec),
  - carrier scorecards (`logiq.carrierScorecard`),
  - capacity forecast + Redis cache (`logiq.capacityForecast`),
  - pick-rate slowdown (`logiq.pickRateScan`),
  - insight digest email (`logiq.insightDigest`).
- Carrier scorecards: aggregates `CarrierPerformanceLog` into `CarrierScorecard` with the spec scoring blend (on-time, damage, cost efficiency).
- Capacity forecasting: exponential smoothing + day-of-week seasonality; 24h Redis cache per account/warehouse; optional `CAPACITY_WARNING` insight when forecast exceeds 90% of recent peak.
- Invoice generation: deterministic `anomalyFlags` unchanged; optional **Claude** second pass merges `claudeFlags` into `Invoice.anomalyFlags` when `ANTHROPIC_API_KEY` is set.
- Merchant chat: `POST /api/ai/merchant-chat` streams plain text; system prompt is scoped to a JSON snapshot of merchant portal data (orders, stock, invoices).
- UI: `/logiq` hub (query bar, charts, insights, forecasts, scorecards, capacity, owner “Run intelligence scans”), `/portal/chat`, `BillingAnomalyPanel` on operator invoice detail.

**Deferred / follow-ups**

- Packing-station “LogIQ recommended” rate is **not** yet driven by `CarrierScorecard` (existing EasyPost heuristic remains).
- BullMQ + Redis **workers** are not wired as long-running consumers for LogIQ; jobs are executed inline when `logiqQueue.add` is called (same pattern as `notifyQueue` in this repo). Schedule `logiqQueue.add` from Railway/cron/Vercel cron as needed.
- NL SQL remains defense-in-depth only (SELECT + keyword block + literal `accountId` check); operators should treat it as power-user tooling.

## Database

**Migration:** `prisma/migrations/20260502120000_module_15_logiq_ai/migration.sql`

**Models** (`prisma/schema.prisma`)

| Model              | Purpose                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `LogIQInsight`     | Operational / AI insights; `dedupeKey` for refresh without spam; `acknowledgedAt` / `acknowledgedBy` |
| `CarrierScorecard` | Per account + carrier + service + zone + weight tier aggregates                                      |
| `LogIQQuery`       | Audit trail for `logiq.query`                                                                        |
| `StockForecast`    | Per product + warehouse; velocity, days remaining, `stockoutRisk`, `outboundSparkline`               |

**Enums:** `InsightType`, `InsightSeverity`

**Relations added to:** `LogiqAccount`, `Merchant`, `Warehouse`, `Product`

**Prisma client accessors:** models `LogIQInsight` / `LogIQQuery` expose as `db.logIQInsight` / `db.logIQQuery` (capital `IQ`).

## API

### tRPC — `logiq` router (`src/server/api/routers/logiq.ts`)

Mounted on `appRouter` as `logiq`.

| Procedure                    | Roles                                                          | Notes                                                                                                             |
| ---------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `logiq.query`                | `THREEPL_ACCOUNT_OWNER`, `WAREHOUSE_MANAGER`, `PLATFORM_ADMIN` | Mutation; WM gets warehouse ids injected into NL system prompt                                                    |
| `logiq.getInsights`          | same                                                           | Cursor on `id` + `createdAt`; WM filtered by managed warehouses                                                   |
| `logiq.acknowledgeInsight`   | same                                                           | WM cannot ack insights for unmanaged warehouses                                                                   |
| `logiq.getStockForecast`     | same                                                           | WM scoped to managed warehouses; `orderBy stockoutRisk desc`                                                      |
| `logiq.getCarrierScorecards` | same                                                           | Optional `carrier`, `weightTier` filters                                                                          |
| `logiq.getCapacityForecast`  | same                                                           | Reads Redis cache key `logiq:capacity:{accountId}:{warehouseId}`; on miss computes, writes cache, returns payload |
| `logiq.runJobs`              | `THREEPL_ACCOUNT_OWNER`, `PLATFORM_ADMIN`                      | Payload: `jobs[]` — `stockout`, `overstock`, `carrierScorecard`, `capacity`, `pickRate`, `digest`                 |

### HTTP

| Route                   | Method | Auth                | Description                                                                                                                                                                                          |
| ----------------------- | ------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/ai/merchant-chat` | POST   | better-auth session | Body: `{ messages: { role, content }[] }`; last message must be `user`. Returns `text/plain` stream. Requires `accountId` + `merchantId` on session; merchant or platform role as enforced in route. |

### Invoice (`invoice.generate`)

After transactional invoice create, `enrichInvoiceAnomaliesWithClaude` may append to `anomalyFlags` (see `src/server/ai/billing-anomaly-claude.ts`).

## UI

| Path                                                               | Component / notes                                                             |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `src/app/(dashboard)/logiq/page.tsx`                               | Renders `LogiqHub`                                                            |
| `src/components/logiq/logiq-hub.tsx`                               | NL query, charts, insights, forecasts, scorecards, capacity, run scans button |
| `src/components/logiq/insight-feed.tsx`                            | Acknowledge actions                                                           |
| `src/components/logiq/stock-forecast-table.tsx`                    | Risk badges + mini sparkline                                                  |
| `src/components/logiq/carrier-scorecard-table.tsx`                 | On-time bar, damage, cost, score                                              |
| `src/components/logiq/capacity-forecast-chart.tsx`                 | Recharts lines + staffing cards                                               |
| `src/app/(portal)/portal/chat/page.tsx`                            | Merchant streaming chat client                                                |
| `src/components/billing/billing-anomaly-panel.tsx`                 | Invoice anomaly accordion                                                     |
| `src/app/(dashboard)/merchants/[id]/invoices/[invoiceId]/page.tsx` | Embeds `BillingAnomalyPanel`                                                  |

## Background jobs / queue

**Types:** `LogiqJobPayload` in `src/server/jobs/queues.ts`

**Processor:** `processLogiqJob` in `src/server/jobs/workers/logiq.worker.ts`

**Enqueue:** `logiqQueue.add(name, payload)` — `payload.accountId` optional; omit to fan out all `logiqAccount` rows.

**Implementations**

- `src/server/logiq/stockout-scan.ts`
- `src/server/logiq/overstock-scan.ts`
- `src/server/logiq/carrier-scorecard-job.ts`
- `src/server/logiq/capacity-forecast.ts` (also exports `readCapacityForecastFromCache`, `computeCapacityForecastForWarehouse`)
- `src/server/logiq/pick-rate-scan.ts`
- `src/server/logiq/insight-digest.ts`

**Redis:** capacity payload TTL `CAPACITY_CACHE_TTL_SECONDS` (86_400) in `src/server/logiq/constants.ts`; uses `src/server/cache/analytics-cache.ts` (Redis or in-memory fallback).

**Email:** `sendLogiqInsightDigestEmail` in `src/lib/email.tsx`; template `src/emails/logiq-insight-digest.tsx`

## AI helpers

| File                                      | Role                                     |
| ----------------------------------------- | ---------------------------------------- |
| `src/server/ai/client.ts`                 | `getAnthropic()`, `DEFAULT_CLAUDE_MODEL` |
| `src/server/ai/query-engine.ts`           | `runNLQuery`                             |
| `src/server/ai/sql-guard.ts`              | `assertTenantScopedSelect`               |
| `src/server/ai/parse-json-block.ts`       | Strip ```fences,`JSON.parse`             |
| `src/server/ai/billing-anomaly-claude.ts` | Optional invoice Claude flags            |
| `src/server/ai/merchant-chat-context.ts`  | Merchant JSON snapshot for chat          |

## Configuration

| Variable            | Required                                               | Description                                                |
| ------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | For NL query, merchant chat, billing Claude enrichment | Anthropic API key (server only)                            |
| `ANTHROPIC_MODEL`   | No                                                     | Defaults to `claude-sonnet-4-5-20250929` in code           |
| `REDIS_URL`         | Recommended                                            | Capacity forecast cache; falls back to in-memory TTL cache |
| `POSTMARK_SERVER_TOKEN` | For digest emails                                  | Same as rest of app; digest skipped / logged if missing    |
| `POSTMARK_FROM`         | Sender address (e.g. `noreply@luceoapp.com`)       | Must be a verified Postmark sender signature               |

## How to verify

1. **Migrate:** `pnpm exec prisma migrate deploy` (or `pnpm exec prisma migrate dev` locally).
2. **Generate client:** `pnpm exec prisma generate` (also runs on `postinstall`).
3. **Env:** set `ANTHROPIC_API_KEY` (and optionally `REDIS_URL`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM`).
4. **Operator UI:** sign in as owner → `/logiq` → run a suggestion query; click **Run intelligence scans** → confirm insights / stock forecast / scorecards update (data-dependent).
5. **Merchant UI:** `/portal/chat` → send a message; confirm streamed reply (503 if no API key).
6. **Invoice:** generate an invoice for a merchant with contract → open invoice detail → `BillingAnomalyPanel` shows deterministic flags; with Claude enabled, check for `claudeFlags` in `anomalyFlags` JSON.
7. **tRPC:** `logiq.getCapacityForecast` with a valid `warehouseId` populates cache after first call.

## Scheduling (production)

The spec calls for periodic jobs (6h stock-out, 02:00 UTC overstock, etc.). This codebase exposes **`logiq.runJobs`** and **`logiqQueue.add`**; wire your scheduler (e.g. Vercel Cron, Railway worker, or BullMQ consumer) to invoke:

- `logiq.stockoutScan`
- `logiq.overstockScan`
- `logiq.carrierScorecard`
- `logiq.capacityForecast`
- `logiq.pickRateScan`
- `logiq.insightDigest` (e.g. 07:00 per-account local time requires one job per TZ or a single UTC job with documented offset)

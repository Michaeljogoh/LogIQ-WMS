# Module 7 - Analytics & Reporting

## Scope Implemented

This module adds analytics and reporting capabilities across operations, inventory, merchants, carriers, receiving, and forecasting, plus a dynamic custom report builder with CSV/PDF export.

## Files Added / Updated

- `src/server/cache/analytics-cache.ts`
  - Added cache utility with:
    - Redis-backed caching (via `REDIS_URL`)
    - in-memory fallback cache when Redis is unavailable
    - helper methods:
      - `getCache`
      - `setCache`
      - `getOrSetCache`

- `src/server/api/routers/analytics.ts`
  - Implemented:
    - `analytics.operationsDashboard`
    - `analytics.inventoryHealth`
    - `analytics.merchantPerformance`
    - `analytics.carrierCost`
    - `analytics.receivingReport`
    - `analytics.capacityForecast`
    - `analytics.customReport`
    - `analytics.customReportExport`
  - Added:
    - date-range normalization helpers
    - exponential smoothing + day-of-week seasonality forecast logic (`alpha = 0.3`)
    - PDF report generation using `pdf-lib`
    - CSV generation for custom reports

- `src/app/trpc/routers/_app.ts`
  - Registered:
    - `analytics`

- `src/app/(dashboard)/analytics/page.tsx`
  - Replaced placeholder with full analytics UI using:
    - shadcn/ui `Tabs`, `Card`, `Table`, `Input`, `Button`, `Badge`
    - Recharts visualizations
    - custom report controls and export trigger

## Procedures & Metrics Implemented

- `analytics.operationsDashboard` (TTL: 5 min)
  - `ordersToday`
  - `fulfillmentRatePct`
  - `avgPickTimeMins`
  - `slaCompliancePct7d`
  - `pendingOrders`

- `analytics.inventoryHealth` (TTL: 15 min)
  - `totalSkus`
  - `totalUnits`
  - `inventoryValueCents`
  - `lowStockCount`
  - `deadStockCount`
  - `top10Movers`

- `analytics.merchantPerformance` (TTL: 15 min)
  - per merchant:
    - `orderCount`
    - `unitsShipped`
    - `billedCents`
    - `slaPct`
    - `breachCount`

- `analytics.carrierCost` (TTL: 30 min)
  - per carrier/service:
    - `shipmentCount`
    - `totalCostCents`
    - `avgCostCents`
    - `onTimeRatePct`
    - `damageRatePct`

- `analytics.capacityForecast` (TTL: 1 hour)
  - 7-day forecast:
    - `predictedOrders`
    - `lowerBound`
    - `upperBound`
    - `recommendedStaff`

- `analytics.customReport` (TTL: none)
  - dynamic dimensions and metrics output:
    - dimensions:
      - `DAY`
      - `MERCHANT`
      - `CARRIER`
      - `WAREHOUSE`
    - metrics:
      - `ORDER_COUNT`
      - `UNITS_SHIPPED`
      - `BILLED_CENTS`
      - `SHIPMENT_COST_CENTS`
      - `RECEIVED_UNITS`
  - returns tabular rows plus chart hint (`line`/`bar`)

- `analytics.customReportExport`
  - returns export payload:
    - CSV string + filename
    - PDF bytes (base64) + filename

## Forecasting Algorithm Implemented

`analytics.capacityForecast` implements the requested method:

1. Fetches last 90 days of order counts (optionally warehouse-scoped)
2. Computes day-of-week seasonal indices
3. Deseasonalizes the time series
4. Applies exponential smoothing (`alpha = 0.3`)
5. Forecasts next 7 days and reapplies seasonality
6. Builds confidence bands using `±1.96 * stdError`
7. Computes staffing with:
   - `recommendedStaff = ceil(predictedOrders / ORDERS_PER_STAFF_PER_SHIFT)`
   - `ORDERS_PER_STAFF_PER_SHIFT = 120`

## UI Workflow Highlights

- `/analytics` includes tabbed analytics sections:
  - Operations dashboard KPIs
  - Inventory health KPIs + top movers chart
  - Merchant performance table
  - Carrier cost analysis table
  - Receiving report summary + line-level table
  - Capacity forecast chart + staffing recommendations
  - Custom report builder:
    - dimension/metric selector buttons
    - chart preview
    - tabular output
    - CSV/PDF export action

## Caching Strategy

- Redis caching is applied for expensive analytics procedures with configurable TTLs.
- If Redis is not configured or unavailable, analytics cache falls back to in-memory storage to keep functionality available in local/dev environments.

## Validation Completed

- Production build (`pnpm build`) successful after implementation.
- TypeScript checks successful.
- No linter diagnostics in touched Module 7 files via `ReadLints`.

# Module 12 — Batch Label Printing & Print Queue

## Scope

Implemented print queues for batch EasyPost label purchase (parallelism capped at 5 via `p-limit`), USPS SCAN form generation (`ScanForm.create`), thermal printer registration and TCP ping, raw ZPL send to printers on port 9100 (default), and operator UI under `/printing` and `/settings/printers`.

Deferred / notes:

- Sending raw PDF over TCP is not used; thermal send prefers stored/fetched ZPL from EasyPost (`label_zpl_url`), then a minimal Code128 ZPL fallback using the tracking number.
- SCAN forms require USPS shipments with valid EasyPost shipment IDs and carrier rules enforced by EasyPost (same origin, etc.).

## Database

Models: `PrintQueue`, `PrintQueueItem`, `ThermalPrinter`; enums `PrintQueueStatus`, `PrintItemStatus`.

Relations: `PrintQueue` → `LogiqAccount`, `Warehouse`; `PrintQueueItem` → `PrintQueue`, `Order`, optional `Shipment`, optional `PackagingType`; `Shipment` optional back-link `printQueueItem`.

Migration: `20260502044013_module_12_print_queue`.

## API

Routers: `printQueue`, `printer` (registered on `appRouter`).

**printQueue**

- `list` — queues for account with warehouse and item count.
- `getById` — queue with items, order summary, shipment summary.
- `unfulfilledOrders` — `{ warehouseId }` — pending, non-fulfilled orders in warehouse (for batch builder).
- `create` — `{ warehouseId, name, items[] }` — each item: `orderId`, composite `easypostRateId` (`easypostShipmentId::rateId`), `weightOz`, optional `packagingTypeId`.
- `purchase` — `{ queueId }` — sets `PURCHASING`, buys pending labels with `p-limit(5)`, persists via shared `recordPurchasedLabel` (same side effects as single `shipment.buyLabel`), updates items; queue becomes `READY` or `PARTIAL_FAILED`.
- `printAll` — `{ queueId, printerId }` — sends ZPL per purchased row; on full success sets queue `PRINTED` and `printedAt`.
- `reprint` — `{ printQueueItemId, printerId }` — requires existing shipment; sets item `REPRINTED`.
- `generateManifest` — `{ queueId }` — USPS EasyPost IDs from purchased rows → `createUspsScanForm`; stores `manifestFormUrl` on queue.

**printer**

- `register`, `list`, `ping` — scoped by account; ping updates `isOnline` / `lastPingAt`.

## UI

- `/printing` — queue list.
- `/printing/new` — warehouse, batch name, select orders, load rates (`shipment.rateShop`), pick rates, create queue.
- `/printing/[id]` — purchase, print all, SCAN form, per-row reprint.
- `/settings/printers` — register printer (IP, port), list, ping.

## Integrations

- EasyPost: `buyShipmentLabel` extended with optional ZPL fetch; `retrieveShipmentZpl`, `createUspsScanForm`.
- Shared persistence: `src/server/shipment/record-purchased-label.ts` used by `shipment.buyLabel` and batch purchase.

## Configuration

Existing: `EASYPOST_API_KEY` or `EASYPOST_TEST_KEY`; S3 for label PDFs (`AWS_*`).

## How to verify

1. `pnpm exec prisma migrate deploy` (or `migrate dev`) so `print_queue*` and `thermal_printer` exist.
2. Register a warehouse printer at `/settings/printers`.
3. Create a queue from unfulfilled orders, load rates, create batch, open queue, purchase labels, print (hardware or network capture), generate SCAN form for USPS rows.

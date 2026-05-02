# Module 13 — Multi-Warehouse Order Routing Engine

## Scope

Implemented routing rules (priority-ordered JSON conditions), automatic order routing (`routeOrderEngine`), nearest-warehouse assignment using US ZIP → approximate coordinates (`zipcodes` + Haversine), split shipments as child orders under a held parent, stock-based hold when nothing can be fulfilled, inter-warehouse **transfer orders** (ship from source / receive at destination with stock movements), and operator UI for rules and transfers.

Deferred / notes:

- Lot- or serial-tracked products on transfer **receive** use a simple path (`lotNumber` / `serialNumber` null on `StockLevel`); tighten if you need full lot traceability on inbound transfers.
- Routing refuses orders that already have a **pick list** (avoids mutating orders mid-pick).
- Split child orders use channel `LOGIQ_SPLIT` and synthetic `channelOrderId` suffixes; fulfill picking/shipping on **children**, not the parent.

## Database

Models: `RoutingRule`; `TransferOrder`, `TransferOrderLine`.

Enums: `RoutingAction` (`ASSIGN_TO_WAREHOUSE`, `ASSIGN_NEAREST`, `SPLIT_SHIPMENT`, `HOLD_FOR_STOCK`); `TransferStatus` (`PENDING`, `SHIPPED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`).

`Order`: optional `parentOrderId` and self-relation `OrderSplit` for split children.

Migrations (folder names under `prisma/migrations/`): `20260502051708_module_13_routing_transfers`, `20260502051838_module_13_routing_transfers`.

## Server logic

- `src/server/routing/distance.ts` — ZIP normalization, Haversine distance (miles).
- `src/server/routing/conditions.ts` — AND of rule conditions: `destinationState`, `orderValue` (sum of line quantities), `carrier`, `sku`.
- `src/server/routing/inventory.ts` — availability, global feasibility, greedy multi-warehouse allocation.
- `src/server/routing/route-order.ts` — `routeOrderEngine(db, accountId, orderId)`: evaluates rules by descending `priority`, merges duplicate product lines, applies actions; split flow creates children and sets parent `ON_HOLD` with `warehouseId` null.

## API

Routers: `routing`, `transfer` (registered on `appRouter`).

**routing.rules**

- `list` — rules for account, ordered by priority (desc) then `createdAt`; includes merchant and warehouse labels.
- `upsert` — create/update rule; `conditions` validated against Zod shape (array of `{ field, operator, value }`); `ASSIGN_TO_WAREHOUSE` requires `warehouseId`.
- `reorder` — `{ orderedRuleIds }`; rewrites priorities as spaced scores for drag-style ordering.

**routing**

- `route` — `{ orderId }` — runs `routeOrderEngine`; maps engine errors to tRPC (`NOT_FOUND`, `PRECONDITION_FAILED` when pick list exists, etc.).

**transfer**

- `list` — transfers with warehouses and line product SKUs.
- `getById` — `{ transferId }` — full detail for ship/receive UI.
- `create` — `{ fromWarehouseId, toWarehouseId, lines[] }` — `toNumber` generated as `TO-{year}-{seq}` per account (advisory lock + raw sequence).
- `ship` — `{ transferId }` — `PENDING` only; decrements source `StockLevel` via FIFO/FEFO bins, `OUTBOUND` `StockMovement`, sets line `shippedQty` to `requestedQty`, status `SHIPPED`.
- `receive` — `{ transferId, lines: [{ lineId, qty, toBinId }] }` — `INBOUND` movements and `StockLevel` upsert at destination; status `RECEIVED` / `PARTIALLY_RECEIVED`.

## UI

- `/settings/routing` — rules table, priority reorder (up/down), sheet to upsert rules (JSON conditions textarea, action + warehouse).
- `/transfers` — transfer list; links to new and detail.
- `/transfers/new` — from/to warehouse, product lines, `transfer.create`.
- `/transfers/[id]` — ship full transfer; receive table with per-line qty + destination bin (`stockLevel.locations` for **to** warehouse).
- `/orders/[id]` — optional **Run routing** control calling `routing.route` (if present in codebase).

## Configuration

- No new env vars for core routing; `zipcodes` npm package used for US ZIP geocoding.

## How to verify

1. Apply migrations so `routing_rule`, `transfer_order`, `transfer_order_line`, and `order.parent_order_id` exist.
2. Create two warehouses with valid US ZIPs on records used for distance if testing `ASSIGN_NEAREST`.
3. Under `/settings/routing`, add a rule (e.g. `ASSIGN_NEAREST` with `conditions: []`), then run routing on an unassigned order without a pick list.
4. Create a transfer at `/transfers/new`, open detail: **Ship**, then **Receive** with bins that exist in the destination warehouse (zones/bins from inventory locations).

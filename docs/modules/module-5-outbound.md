# Module 5 - Outbound (Pick, Pack & Ship)

## Scope Implemented

This module covers order management, stock reservation + pick list generation, scanner-based picking, packing/rate shop, label purchase + S3 storage, shipment tracking events, and carrier performance logging.

## Files Added / Updated

- `prisma/schema.prisma`
  - Added:
    - `Order`
    - `OrderLine`
    - `PickList`
    - `PickListItem`
    - `Shipment`
    - `TrackingEvent`
    - `CarrierPerformanceLog`
  - Added enums:
    - `OrderStatus`
    - `FulfillmentStatus`
    - `PickStrategy`
    - `PickStatus`
    - `ShipmentStatus`
  - Added relations to existing tenant, merchant, inventory, and warehouse models.

- `src/server/api/routers/order.ts`
  - Implemented:
    - `order.list` (tabbed filters)
    - `order.getById`
    - `order.create`
    - `order.bulkSetStatus` (hold/unhold flow)

- `src/server/api/routers/pick-list.ts`
  - Implemented:
    - `pickList.createForOrder`
    - `pickList.getById`
    - `pickList.scan`

- `src/server/api/routers/shipment.ts`
  - Implemented:
    - `shipment.getById`
    - `shipment.rateShop`
    - `shipment.buyLabel`
    - `shipment.addTrackingEvent`

- `src/server/integrations/easypost.ts`
  - Implemented real EasyPost integration:
    - `createRateShopShipment`
    - `buyShipmentLabel`

- `src/lib/s3.ts`
  - Implemented real S3 helpers:
    - `putObject`
    - `getObjectPresignedUrl`

- `src/app/trpc/routers/_app.ts`
  - Registered:
    - `order`
    - `pickList`
    - `shipment`

- UI pages implemented:
  - `src/app/(dashboard)/orders/page.tsx`
  - `src/app/(dashboard)/orders/[id]/page.tsx`
  - `src/app/(dashboard)/picking/[id]/page.tsx`
  - `src/app/(dashboard)/packing/[id]/page.tsx`
  - `src/app/(dashboard)/shipments/[id]/page.tsx`
  - `src/app/(dashboard)/returns/[id]/page.tsx`

## Core Business Logic Implemented

- Order management:
  - Tab-based listing:
    - `UNFULFILLED`
    - `DUE_TODAY`
    - `ALL`
  - Bulk status updates for hold/unhold operations.

- Stock reservation and pick list creation:
  - On `pickList.createForOrder`:
    - Finds stock rows per order line
    - FEFO when product expiry tracking is enabled, else FIFO-like fallback
    - Increments `reservedQty` atomically
    - Creates pick list items by bin allocation
  - Fails atomically when stock is insufficient.

- Barcode scan validation:
  - On `pickList.scan`:
    - Validates scanned barcode against product barcode
    - Rejects mismatch unless `overrideMismatch = true`
    - Requires `auditNote` on override
    - Updates item picked qty and order line picked qty
    - Advances pick list status (`PENDING` -> `IN_PROGRESS` -> `COMPLETED`)

- Rate shop and label purchase:
  - Real EasyPost rate shopping using from/to addresses and parcel weight.
  - Real EasyPost label purchase by selected rate.
  - Downloads carrier label PDF and uploads to S3:
    - `{accountId}/labels/{timestamp}-{orderId}.pdf`
  - Stores S3 location in shipment and returns presigned download URL.

- Tracking and carrier performance:
  - `shipment.addTrackingEvent` appends shipment timeline events.
  - On `DELIVERED` event:
    - computes `actualDays`
    - upserts `CarrierPerformanceLog`
    - computes `onTime` against order SLA when available.

## UI Workflow Highlights

- Orders table with tabs and bulk hold/unhold actions.
- Order detail with line-level progress and pick-list creation.
- Responsive picking page optimized for handheld/tablet scanning.
- Packing page with weight input, rate shop table, buy label action.
- Shipment page with live tracking timeline controls.
- Returns page scaffold with per-line condition and disposition decisions.

## Integration Notes

- EasyPost requires:
  - `EASYPOST_API_KEY` or `EASYPOST_TEST_KEY`
- S3 requires:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`
  - optional `AWS_REGION` (defaults to `us-east-1`)

- `shipment.getById` resolves `labelDownloadUrl` using S3 presigned URLs when shipment label is stored in S3.

## Notes

- All outbound procedures enforce account scoping (`accountId`) and role checks via shared middleware.
- Zod input validation is used on all added procedures.

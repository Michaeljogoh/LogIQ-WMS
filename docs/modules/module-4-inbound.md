# Module 4 - Inbound (Purchase Orders & Receiving)

## Scope Implemented

This module covers supplier management, purchase order lifecycle, ASN support, receiving workflow, putaway suggestions, and work orders.

## Files Added / Updated

- `prisma/schema.prisma`
  - Added:
    - `Supplier`
    - `PurchaseOrder`
    - `PurchaseOrderLine`
    - `ReceivingRecord`
    - `WorkOrder`
    - `WorkOrderInput`
    - `PurchaseOrderAsn`
  - Added enums:
    - `POStatus`
    - `WorkOrderType`
    - `WorkOrderStatus`
    - `AsnStatus`
  - Added relations to existing models (`LogiqAccount`, `Warehouse`, `Merchant`, `Product`, `Bin`).

- `src/server/api/routers/supplier.ts`
  - Implemented:
    - `supplier.list`
    - `supplier.create`
    - `supplier.update`
  - Includes supplier on-time KPI (`onTimeRatePct`).

- `src/server/api/routers/purchase-order.ts`
  - Implemented:
    - `purchaseOrder.list`
    - `purchaseOrder.getById`
    - `purchaseOrder.create`
    - `purchaseOrder.updateStatus`
    - `purchaseOrder.getPutawaySuggestions`
    - `purchaseOrder.receiveScan`
    - `purchaseOrder.createAsn`

- `src/server/api/routers/work-order.ts`
  - Implemented:
    - `workOrder.list`
    - `workOrder.getById`
    - `workOrder.create`
    - `workOrder.start`
    - `workOrder.complete`

- `src/app/trpc/routers/_app.ts`
  - Registered:
    - `supplier`
    - `purchaseOrder`
    - `workOrder`

- UI pages implemented:
  - `src/app/(dashboard)/inbound/page.tsx`
  - `src/app/(dashboard)/inbound/suppliers/page.tsx`
  - `src/app/(dashboard)/inbound/purchase-orders/page.tsx`
  - `src/app/(dashboard)/inbound/purchase-orders/new/page.tsx`
  - `src/app/(dashboard)/inbound/purchase-orders/[id]/receive/page.tsx`
  - `src/app/(dashboard)/inbound/work-orders/new/page.tsx`

## Core Business Logic Implemented

- PO number generation:
  - `PO-{YYYY}-{zero-padded-seq}`
  - Sequence generated atomically using transaction lock + raw SQL.

- Receiving atomic transaction:
  - Creates `ReceivingRecord`
  - Writes `StockMovement` (`INBOUND`)
  - Upserts/updates `StockLevel`
  - Increments `PurchaseOrderLine.receivedQty`
  - Recomputes PO status (`PARTIALLY_RECEIVED` / `RECEIVED`)

- Over-receive guard:
  - Enforces `orderedQty * 1.1` threshold
  - Supports explicit override flag.

- Scan line matching:
  - Supports `poLineId` direct selection
  - Supports `scannedBarcode` matching by product barcode/SKU.

- Putaway suggestions:
  - Ranked by:
    1. bins already containing same product
    2. available capacity score
    3. alphabetical bin label
  - Returns top 3.

- Work order reservation:
  - On `start`, reserves `StockLevel.reservedQty` atomically.
  - Fails if available stock is insufficient.

- Work order completion:
  - Consumes reserved input stock (`WORK_ORDER_CONSUME`)
  - Produces output stock (`WORK_ORDER_PRODUCE`)
  - Updates consumed/completed quantities and status.

## UI Workflow Highlights

- Supplier create/list with lead time and on-time rate.
- PO list with status filters and progression actions.
- PO creation form (supplier -> lines -> expected date).
- Responsive receive screen for scanner/tablet use (44px+ targets).
- ASN creation block on PO receive page.
- Work order create + execution actions (start/complete).

## Notes

- Tenant isolation and role checks are applied on all procedures via protected middleware and `accountId` scoping.
- Input validation is done with Zod in all new procedures.

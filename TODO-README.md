# Inbound Module TODO

This checklist tracks implementation progress for **Section 6 — Module 4: Inbound — Purchase Orders & Receiving**.

## Implemented

- [x] Prisma inbound models added:
  - `Supplier`
  - `PurchaseOrder`
  - `PurchaseOrderLine`
  - `ReceivingRecord`
  - `WorkOrder`
  - `WorkOrderInput`
  - `PurchaseOrderAsn`
  - enums: `POStatus`, `WorkOrderType`, `WorkOrderStatus`, `AsnStatus`
- [x] Relations wired to existing tenant/inventory models (`LogiqAccount`, `Warehouse`, `Merchant`, `Product`, `Bin`).
- [x] Supplier router implemented:
  - `supplier.list`
  - `supplier.create`
  - `supplier.update`
  - on-time KPI included in list response
- [x] Purchase order router implemented:
  - `purchaseOrder.list`
  - `purchaseOrder.getById`
  - `purchaseOrder.create`
  - `purchaseOrder.updateStatus`
  - `purchaseOrder.getPutawaySuggestions`
  - `purchaseOrder.receiveScan`
  - `purchaseOrder.createAsn`
- [x] PO number generation implemented (`PO-YYYY-######`) with transactional lock strategy.
- [x] Receiving atomic transaction implemented:
  - create `ReceivingRecord`
  - create `StockMovement` (`INBOUND`)
  - upsert/update `StockLevel`
  - increment `PurchaseOrderLine.receivedQty`
  - update PO rollup status (`PARTIALLY_RECEIVED` / `RECEIVED`)
- [x] Over-receive guard implemented with override support.
- [x] Barcode/SKU-based PO line matching implemented for receiving scan.
- [x] Putaway suggestion ranking implemented (same product, capacity score, alphabetical).
- [x] Work order router implemented:
  - `workOrder.list`
  - `workOrder.getById`
  - `workOrder.create`
  - `workOrder.start`
  - `workOrder.complete`
- [x] Work order reservation logic implemented on start (`reservedQty` checks and updates).
- [x] Work order completion transaction implemented:
  - consume inputs (`WORK_ORDER_CONSUME`)
  - produce output (`WORK_ORDER_PRODUCE`)
  - update work order status and completion fields

## UI Implemented

- [x] `/inbound` dashboard cards (open POs, expected this week, pending work orders, in-transit, partially received).
- [x] `/inbound/suppliers` supplier create form + supplier table with on-time rate.
- [x] `/inbound/purchase-orders` PO list with status filter and track/status progression actions.
- [x] `/inbound/purchase-orders/new` basic PO creation flow.
- [x] `/inbound/purchase-orders/[id]/receive` responsive receiving page with:
  - line selection
  - barcode/SKU scan input
  - quantity input
  - putaway bin selection
  - over-receive confirmation flow
  - ASN creation block
- [x] `/inbound/work-orders/new` work order creation + execution actions (start/complete).

## Remaining / Next Improvements

- [ ] Add ASN lifecycle updates (`SENT`, `RECEIVED`, `CANCELLED`) with dedicated UI actions.
- [ ] Add stronger PO lifecycle guardrails (strict transitions and audit trail entries).
- [ ] Improve putaway suggestion with true spatial/capacity constraints (weight/volume aware).
- [ ] Expand receiving UX for multi-line rapid scan mode (scanner-first flow).
- [ ] Add inbound analytics widgets (receiving exceptions, supplier SLA trend).
- [ ] Add integration and unit tests for:
  - PO receive atomicity
  - over-receive threshold behavior
  - work order reservation/consumption correctness
  - ASN creation and uniqueness constraints

## Required Ops Step

- [ ] Run migration for schema updates:
  - `pnpm prisma migrate dev -n "add_inbound_asn_and_operation_updates"`

# Module 3 - Inventory Management

## Scope Implemented

This module provides product, stock level, stock movement, cycle count, and inventory alert capabilities with tenant-scoped access and operational workflows.

## Key Files

- `prisma/schema.prisma`
  - Inventory models and enums:
    - `Product`
    - `StockLevel`
    - `StockMovement`
    - `CycleCount`
    - `CycleCountLine`
    - movement + cycle status enums

- `src/server/api/routers/product.ts`
  - Implemented:
    - `product.create`
    - `product.update`
    - `product.list`
    - `product.getById`

- `src/server/api/routers/stock-level.ts`
  - Implemented:
    - `stockLevel.locations`
    - `stockLevel.recentMovements`
    - `stockLevel.getByProduct`
    - `stockLevel.adjust`
    - `stockLevel.transfer`

- `src/server/api/routers/cycle-count.ts`
  - Implemented:
    - `cycleCount.list`
    - `cycleCount.getById`
    - `cycleCount.create`
    - `cycleCount.submitScan`
    - `cycleCount.reconcile`

- `src/server/api/routers/alerts.ts`
  - Implemented:
    - `alerts.getLowStock`
    - `alerts.getDeadStock`

- UI pages:
  - `src/app/(dashboard)/inventory/page.tsx`
  - `src/app/(dashboard)/inventory/products/page.tsx`
  - `src/app/(dashboard)/inventory/products/[id]/page.tsx`
  - `src/app/(dashboard)/inventory/locations/page.tsx`
  - `src/app/(dashboard)/inventory/cycle-counts/page.tsx`
  - `src/app/(dashboard)/inventory/cycle-counts/[id]/page.tsx`
  - `src/app/(dashboard)/inventory/cycle-counts/[id]/reconcile/page.tsx`

## Core Logic

- Product lifecycle:
  - Create/update/list/detail with merchant-level scope under account tenancy.

- Stock adjustment and transfer:
  - Quantity updates with movement audit logging.
  - Negative stock protection unless explicit override path is used.
  - Transfer flow writes movement records for both source and destination behavior.

- Cycle count workflow:
  - Creates count sessions from selected bins.
  - Supports scan submissions by line.
  - Reconciliation applies discrepancies via movement records and updates stock.

- Alert queries:
  - Low stock computed from available quantity vs thresholds.
  - Dead stock detection based on no-movement windows.

## Notes

- Inventory is the operational foundation for inbound and outbound.
- Movement logging is used later by analytics and LogIQ intelligence features.

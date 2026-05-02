# Module 11 — Packaging Library

## Scope

- **`PackagingType`** model: dimensions (in), max load (oz), tare (oz), cost (cents per box).
- **`Shipment`** extensions: `packagingTypeId`, `packagingCostCents`, `dimWeightOz` (DIM weight for the **purchased** carrier’s divisor).
- **DIM divisors:** USPS 166; FedEx / UPS / DHL 139 (see `src/server/packaging/dim-weight.ts`).
- **Smart suggest:** Sum line-item volume (simple sum of unit volumes × qty) and weight; filter boxes where internal volume ≥ total volume and `maxWeightOz ≥ itemsWeight + tare`; sort by `lengthIn` asc; return top 3 with per-carrier DIM and billable weight.
- **tRPC:** `packaging.create`, `packaging.list`, `packaging.suggest`, `packaging.costReport`.
- **EasyPost:** `createRateShopShipment` accepts optional parcel **length/width/height** (inches) with weight (oz).
- **UI:** `/settings/packaging` — CRUD list, monthly cost-by-merchant report; `/packing/[id]` — suggester panel, DIM table, weight auto-fill (items + tare), rate shop uses parcel dims + weight, **Buy label** persists packaging + DIM + `rateCents`.

## Verification

1. Migrate: `module_11_packaging_library`.
2. Create box types under `/settings/packaging`.
3. Open `/packing/{orderId}` — select a box, confirm weights/DIM rows, run rate shop, buy label.
4. Check `packaging.costReport` month — sums `packagingCostCents` on shipments with `packagingTypeId` in range.

## Notes

- Billable weight display uses items + tare vs DIM per carrier; rating sends **physical** weight (override allowed) plus **box dimensions** so carriers can apply DIM in rating where supported.

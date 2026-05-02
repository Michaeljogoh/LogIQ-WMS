# Module 10 — Barcode & Label Generation

## Scope

- Prisma models `LabelTemplate`, `GeneratedLabel`, enum `LabelType`.
- PDF composition with **bwip-js** (Node entry `bwip-js/node`) and **pdf-lib**; optional **ZPL** strings stored on `GeneratedLabel.zplContent` for thermal reprints.
- Upload to S3 via `putObject`; viewing uses presigned GET URLs (`getObjectPresignedUrl`).
- tRPC: `labelTemplate` (create, update, list) and `label` (generateProduct, generateBin, generatePallet, getByReference).
- UI: `/labels/templates`, `/labels/templates/new` (template designer with canvas preview), print actions on product detail and inventory locations.
- On **product.create**, if a default `PRODUCT_BARCODE` template exists, a best-effort auto-generation runs (errors ignored so SKU creation never fails).

## Database

- Migration: `20260502034554_module_10_barcode_labels`.
- `LabelTemplate.fields`: JSON array validated by `labelFieldsArraySchema` in `src/lib/label-field-config.ts` (top-left coordinates in **points**, `y` from top of page).

## API

| Router          | Procedures                                                           |
| --------------- | -------------------------------------------------------------------- |
| `labelTemplate` | `create`, `update`, `list`                                           |
| `label`         | `generateProduct`, `generateBin`, `generatePallet`, `getByReference` |

Roles mirror inventory/product access (`THREEPL_ACCOUNT_OWNER`, `WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF`, `PLATFORM_ADMIN`).

## UI routes

| Route                      | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `/labels/templates`        | List templates; filter by label type          |
| `/labels/templates/new`    | Designer (`?type=` preset); saves template    |
| `/inventory/products/[id]` | **Print barcode label** → opens presigned PDF |
| `/inventory/locations`     | **Print bin label** per bin card              |

## Configuration

- **Required for PDF generation:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION` (see `src/lib/s3.ts`).
- Without S3, mutations return `PRECONDITION_FAILED` with a clear message.

## Verification

1. `pnpm exec prisma migrate deploy` (or `migrate dev`) so label tables exist.
2. Configure S3 env vars.
3. Create a default `PRODUCT_BARCODE` template at `/labels/templates/new`; create a product — optional auto `GeneratedLabel` row.
4. From product detail, **Print barcode label** — PDF opens in a new tab.
5. From **Locations**, **Print bin label** — requires default `BIN_LOCATION` template.

## Notes

- **Labelary** (ZPL→PNG preview) is not wired; PDF preview is primary.
- Pallet labels use `purchaseOrderId` plus optional `palletCode`; `referenceId` is `poId` or `poId:code`.

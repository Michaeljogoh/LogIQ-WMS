import type {
  Bin,
  Merchant,
  Product,
  PurchaseOrder,
  Warehouse,
  Zone,
} from "@/generated/prisma/client";

export type ProductTokenContext = {
  product: Product & { merchant: Pick<Merchant, "name"> };
};

export type BinTokenContext = {
  bin: Bin & {
    zone: Pick<Zone, "code" | "name">;
    warehouse: Pick<Warehouse, "name" | "code">;
  };
};

export type PalletTokenContext = {
  po: PurchaseOrder & {
    merchant: Pick<Merchant, "name">;
    warehouse: Pick<Warehouse, "name" | "code">;
  };
  palletRef: string;
};

/** Replace `{{token}}` segments in template strings. */
export function resolveLabelTokens(
  template: string,
  vars: Record<string, string | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v ?? "";
  });
}

export function buildProductVars(
  ctx: ProductTokenContext,
): Record<string, string> {
  const p = ctx.product;
  return {
    sku: p.sku,
    name: p.name,
    barcode: p.barcode ?? p.sku,
    merchantName: p.merchant.name,
  };
}

export function buildBinVars(ctx: BinTokenContext): Record<string, string> {
  const b = ctx.bin;
  return {
    binLabel: b.label,
    zoneCode: b.zone.code,
    zoneName: b.zone.name,
    aisle: b.aisle,
    rack: b.rack,
    level: b.level,
    position: b.position,
    warehouseName: b.warehouse.name,
    warehouseCode: b.warehouse.code,
  };
}

export function buildPalletVars(
  ctx: PalletTokenContext,
): Record<string, string> {
  const po = ctx.po;
  return {
    poNumber: po.poNumber,
    palletId: ctx.palletRef,
    merchantName: po.merchant.name,
    warehouseCode: po.warehouse.code,
    warehouseName: po.warehouse.name,
  };
}

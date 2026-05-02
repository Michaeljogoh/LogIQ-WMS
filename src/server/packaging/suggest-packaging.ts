import type { PackagingType, Product } from "@/generated/prisma/client";
import {
  billableWeightOz,
  DIM_DIVISORS_OZ,
  type DimCarrierKey,
  dimWeightOzFromBox,
} from "@/server/packaging/dim-weight";

type LineWithProduct = {
  quantity: number;
  product: ProductDims & { id: string };
};

type ProductDims = Pick<
  Product,
  "lengthIn" | "widthIn" | "heightIn" | "weightOz"
>;

function safeDims(p: ProductDims): { l: number; w: number; h: number } {
  const l = p.lengthIn ?? 1;
  const w = p.widthIn ?? 1;
  const h = p.heightIn ?? 1;
  return {
    l: Math.max(0.01, l),
    w: Math.max(0.01, w),
    h: Math.max(0.01, h),
  };
}

function safeWeightOz(p: ProductDims, qty: number): number {
  const per = p.weightOz ?? 1;
  return Math.max(0.01, per) * qty;
}

export function aggregateOrderLinesForPackaging(lines: LineWithProduct[]): {
  totalVolumeIn3: number;
  totalWeightOz: number;
} {
  let totalVolumeIn3 = 0;
  let totalWeightOz = 0;
  for (const line of lines) {
    const { l, w, h } = safeDims(line.product);
    const qty = line.quantity;
    totalVolumeIn3 += l * w * h * qty;
    totalWeightOz += safeWeightOz(line.product, qty);
  }
  return { totalVolumeIn3, totalWeightOz };
}

export type PackagingSuggestion = PackagingType & {
  dimWeightOzByCarrier: Record<DimCarrierKey, number>;
  billableWeightOzByCarrier: Record<DimCarrierKey, number>;
};

export function enrichSuggestionsWithDim(
  boxes: PackagingType[],
  itemsWeightOz: number,
): PackagingSuggestion[] {
  return boxes.map((box) => {
    const dimWeightOzByCarrier = {} as Record<DimCarrierKey, number>;
    const billableWeightOzByCarrier = {} as Record<DimCarrierKey, number>;
    const actualOz = itemsWeightOz + box.tareWeightOz;
    for (const key of Object.keys(DIM_DIVISORS_OZ) as DimCarrierKey[]) {
      const divisor = DIM_DIVISORS_OZ[key];
      const dimOz = dimWeightOzFromBox({
        lengthIn: box.lengthIn,
        widthIn: box.widthIn,
        heightIn: box.heightIn,
        divisor,
      });
      dimWeightOzByCarrier[key] = Math.round(dimOz * 100) / 100;
      billableWeightOzByCarrier[key] =
        Math.round(billableWeightOz(actualOz, dimOz) * 100) / 100;
    }
    return {
      ...box,
      dimWeightOzByCarrier,
      billableWeightOzByCarrier,
    };
  });
}

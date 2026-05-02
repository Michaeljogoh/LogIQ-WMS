/** Carrier DIM divisors (domestic typical). Volume in cubic inches / divisor = DIM weight in lb → oz = * 16 */
export const DIM_DIVISORS_OZ = {
  USPS: 166,
  FedEx: 139,
  UPS: 139,
  DHL: 139,
} as const;

export type DimCarrierKey = keyof typeof DIM_DIVISORS_OZ;

export function divisorForCarrierLabel(carrier: string): number {
  const c = carrier.toUpperCase();
  if (c.includes("USPS")) {
    return DIM_DIVISORS_OZ.USPS;
  }
  if (c.includes("FEDEX")) {
    return DIM_DIVISORS_OZ.FedEx;
  }
  if (c.includes("UPS")) {
    return DIM_DIVISORS_OZ.UPS;
  }
  if (c.includes("DHL")) {
    return DIM_DIVISORS_OZ.DHL;
  }
  return DIM_DIVISORS_OZ.UPS;
}

/** DIM weight in ounces: (L×W×H) / divisor × 16 (lb → oz) — divisor is cubic inches per lb. */
export function dimWeightOzFromBox(args: {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  divisor: number;
}): number {
  const cubicIn = args.lengthIn * args.widthIn * args.heightIn;
  if (!Number.isFinite(cubicIn) || cubicIn <= 0 || args.divisor <= 0) {
    return 0;
  }
  const dimLb = cubicIn / args.divisor;
  return dimLb * 16;
}

export function billableWeightOz(actualOz: number, dimOz: number): number {
  return Math.max(actualOz, dimOz);
}

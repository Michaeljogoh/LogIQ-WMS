import type { PrismaClient } from "../../../../generated/prisma/client";
import type { SeedContext } from "../types";

type ProductSpec = {
  name: string;
  sku: string;
  barcode: string;
  weightOz: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  lowStockThreshold: number;
};

const APEX_PRODUCTS: ProductSpec[] = [
  {
    name: "Performance T-Shirt Black S",
    sku: "APEX-TS-BLK-S",
    barcode: "8901234560001",
    weightOz: 6,
    lengthIn: 12,
    widthIn: 9,
    heightIn: 1,
    lowStockThreshold: 20,
  },
  {
    name: "Performance T-Shirt Black M",
    sku: "APEX-TS-BLK-M",
    barcode: "8901234560002",
    weightOz: 7,
    lengthIn: 12,
    widthIn: 9,
    heightIn: 1,
    lowStockThreshold: 20,
  },
  {
    name: "Performance T-Shirt Black L",
    sku: "APEX-TS-BLK-L",
    barcode: "8901234560003",
    weightOz: 8,
    lengthIn: 12,
    widthIn: 9,
    heightIn: 1,
    lowStockThreshold: 20,
  },
  {
    name: "Performance T-Shirt White M",
    sku: "APEX-TS-WHT-M",
    barcode: "8901234560004",
    weightOz: 7,
    lengthIn: 12,
    widthIn: 9,
    heightIn: 1,
    lowStockThreshold: 20,
  },
  {
    name: "Running Shorts Navy M",
    sku: "APEX-SH-NVY-M",
    barcode: "8901234560005",
    weightOz: 5,
    lengthIn: 10,
    widthIn: 8,
    heightIn: 1,
    lowStockThreshold: 15,
  },
  {
    name: "Running Shorts Navy L",
    sku: "APEX-SH-NVY-L",
    barcode: "8901234560006",
    weightOz: 6,
    lengthIn: 10,
    widthIn: 8,
    heightIn: 1,
    lowStockThreshold: 15,
  },
  {
    name: "Windbreaker Jacket Grey M",
    sku: "APEX-JKT-GRY-M",
    barcode: "8901234560007",
    weightOz: 14,
    lengthIn: 14,
    widthIn: 11,
    heightIn: 2,
    lowStockThreshold: 10,
  },
  {
    name: "Performance Cap Black",
    sku: "APEX-CAP-BLK",
    barcode: "8901234560008",
    weightOz: 3,
    lengthIn: 8,
    widthIn: 7,
    heightIn: 4,
    lowStockThreshold: 10,
  },
];

const NOVATECH_PRODUCTS: ProductSpec[] = [
  {
    name: "True Wireless Earbuds Pro",
    sku: "NOVA-TWS-001",
    barcode: "8901234561001",
    weightOz: 4,
    lengthIn: 4,
    widthIn: 3,
    heightIn: 2,
    lowStockThreshold: 15,
  },
  {
    name: "20W USB-C Fast Charger",
    sku: "NOVA-CHG-20W",
    barcode: "8901234561002",
    weightOz: 3,
    lengthIn: 4,
    widthIn: 3,
    heightIn: 2,
    lowStockThreshold: 20,
  },
  {
    name: "2m USB-C Braided Cable",
    sku: "NOVA-CAB-USB",
    barcode: "8901234561003",
    weightOz: 2,
    lengthIn: 8,
    widthIn: 3,
    heightIn: 1,
    lowStockThreshold: 25,
  },
  {
    name: "Portable Bluetooth Speaker",
    sku: "NOVA-SPK-001",
    barcode: "8901234561004",
    weightOz: 12,
    lengthIn: 7,
    widthIn: 3,
    heightIn: 3,
    lowStockThreshold: 10,
  },
  {
    name: "Wireless Keyboard TKL",
    sku: "NOVA-KB-001",
    barcode: "8901234561005",
    weightOz: 20,
    lengthIn: 14,
    widthIn: 6,
    heightIn: 2,
    lowStockThreshold: 8,
  },
  {
    name: "Ergonomic Wireless Mouse",
    sku: "NOVA-MSE-001",
    barcode: "8901234561006",
    weightOz: 5,
    lengthIn: 5,
    widthIn: 4,
    heightIn: 2,
    lowStockThreshold: 12,
  },
  {
    name: "4-Port USB-C Hub",
    sku: "NOVA-HUB-4P",
    barcode: "8901234561007",
    weightOz: 4,
    lengthIn: 4,
    widthIn: 2,
    heightIn: 1,
    lowStockThreshold: 15,
  },
  {
    name: "10000mAh Power Bank",
    sku: "NOVA-PWR-10K",
    barcode: "8901234561008",
    weightOz: 8,
    lengthIn: 6,
    widthIn: 3,
    heightIn: 1,
    lowStockThreshold: 10,
  },
];

const LUMIERE_PRODUCTS: ProductSpec[] = [
  {
    name: "Vitamin C Brightening Serum 30ml",
    sku: "LUM-SEP-001",
    barcode: "8901234562001",
    weightOz: 2,
    lengthIn: 4,
    widthIn: 2,
    heightIn: 2,
    lowStockThreshold: 20,
  },
  {
    name: "Rose Hip Face Oil 50ml",
    sku: "LUM-OIL-001",
    barcode: "8901234562002",
    weightOz: 3,
    lengthIn: 5,
    widthIn: 2,
    heightIn: 2,
    lowStockThreshold: 15,
  },
  {
    name: "Daily Moisturizer SPF15 60ml",
    sku: "LUM-CRM-DAY",
    barcode: "8901234562003",
    weightOz: 3,
    lengthIn: 4,
    widthIn: 3,
    heightIn: 3,
    lowStockThreshold: 20,
  },
  {
    name: "Hydrating Sheet Mask Pack x5",
    sku: "LUM-MSK-001",
    barcode: "8901234562004",
    weightOz: 5,
    lengthIn: 6,
    widthIn: 4,
    heightIn: 2,
    lowStockThreshold: 25,
  },
  {
    name: "Micellar Cleansing Water 200ml",
    sku: "LUM-CLN-001",
    barcode: "8901234562005",
    weightOz: 8,
    lengthIn: 7,
    widthIn: 3,
    heightIn: 3,
    lowStockThreshold: 20,
  },
  {
    name: "Eye Contour Cream 15ml",
    sku: "LUM-EYE-001",
    barcode: "8901234562006",
    weightOz: 2,
    lengthIn: 3,
    widthIn: 2,
    heightIn: 2,
    lowStockThreshold: 15,
  },
  {
    name: "SPF 50 Face Sunscreen 50ml",
    sku: "LUM-SPF-001",
    barcode: "8901234562007",
    weightOz: 3,
    lengthIn: 5,
    widthIn: 3,
    heightIn: 2,
    lowStockThreshold: 18,
  },
  {
    name: "Hydrating Toner 150ml",
    sku: "LUM-TON-001",
    barcode: "8901234562008",
    weightOz: 6,
    lengthIn: 6,
    widthIn: 3,
    heightIn: 3,
    lowStockThreshold: 20,
  },
];

async function createProductsForMerchant(
  db: PrismaClient,
  accountId: string,
  merchantId: string,
  specs: ProductSpec[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const spec of specs) {
    const product = await db.product.create({
      data: {
        accountId,
        merchantId,
        name: spec.name,
        sku: spec.sku,
        barcode: spec.barcode,
        weightOz: spec.weightOz,
        lengthIn: spec.lengthIn,
        widthIn: spec.widthIn,
        heightIn: spec.heightIn,
        lotTracking: false,
        serialTracking: false,
        expiryTracking: false,
        lowStockThreshold: spec.lowStockThreshold,
        deadStockDays: 90,
        isActive: true,
      },
    });
    ids.push(product.id);
  }
  return ids;
}

export async function seedProducts(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const [
    apexProductIds,
    novatechProductIds,
    lumiereProductIds,
    packagingTypes,
  ] = await Promise.all([
    createProductsForMerchant(db, ctx.accountId, ctx.apexId, APEX_PRODUCTS),
    createProductsForMerchant(
      db,
      ctx.accountId,
      ctx.novatechId,
      NOVATECH_PRODUCTS,
    ),
    createProductsForMerchant(
      db,
      ctx.accountId,
      ctx.lumiereId,
      LUMIERE_PRODUCTS,
    ),
    db.packagingType.createManyAndReturn({
      data: [
        {
          accountId: ctx.accountId,
          name: "Small Poly Mailer",
          lengthIn: 10,
          widthIn: 13,
          heightIn: 0.1,
          maxWeightOz: 16,
          tareWeightOz: 0.5,
          costCents: 25,
          isActive: true,
        },
        {
          accountId: ctx.accountId,
          name: "Small Box 8x6x4",
          lengthIn: 8,
          widthIn: 6,
          heightIn: 4,
          maxWeightOz: 48,
          tareWeightOz: 8,
          costCents: 75,
          isActive: true,
        },
        {
          accountId: ctx.accountId,
          name: "Medium Box 12x9x6",
          lengthIn: 12,
          widthIn: 9,
          heightIn: 6,
          maxWeightOz: 96,
          tareWeightOz: 14,
          costCents: 125,
          isActive: true,
        },
        {
          accountId: ctx.accountId,
          name: "Large Box 18x12x10",
          lengthIn: 18,
          widthIn: 12,
          heightIn: 10,
          maxWeightOz: 320,
          tareWeightOz: 28,
          costCents: 200,
          isActive: true,
        },
      ],
    }),
  ]);

  return {
    ...ctx,
    apexProductIds,
    novatechProductIds,
    lumiereProductIds,
    packagingTypeIds: packagingTypes.map((p) => p.id),
  };
}

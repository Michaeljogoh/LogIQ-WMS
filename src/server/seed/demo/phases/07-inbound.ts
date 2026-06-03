import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt, seqRef } from "../helpers";
import type { SeedContext } from "../types";

type POSpec = {
  merchantId: string;
  supplierId: string;
  warehouseId: string;
  status:
    | "DRAFT"
    | "SENT"
    | "CONFIRMED"
    | "IN_TRANSIT"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "CANCELLED";
  productIds: string[];
  daysAgoCreated: number;
  receivedDaysAgo?: number;
};

export async function seedInbound(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const [apexSup0 = "", apexSup1 = ""] = ctx.apexSupplierIds;
  const [novaSup0 = "", novaSup1 = ""] = ctx.novatechSupplierIds;
  const [lumSup0 = "", lumSup1 = ""] = ctx.lumiereSupplierIds;

  const poSpecs: POSpec[] = [
    // Apex POs
    {
      merchantId: ctx.apexId,
      supplierId: apexSup0,
      warehouseId: ctx.laxId,
      status: "DRAFT",
      productIds: ctx.apexProductIds.slice(0, 4),
      daysAgoCreated: 2,
    },
    {
      merchantId: ctx.apexId,
      supplierId: apexSup0,
      warehouseId: ctx.laxId,
      status: "SENT",
      productIds: ctx.apexProductIds.slice(0, 3),
      daysAgoCreated: 7,
    },
    {
      merchantId: ctx.apexId,
      supplierId: apexSup1,
      warehouseId: ctx.laxId,
      status: "IN_TRANSIT",
      productIds: ctx.apexProductIds.slice(4, 8),
      daysAgoCreated: 14,
    },
    {
      merchantId: ctx.apexId,
      supplierId: apexSup1,
      warehouseId: ctx.ordId,
      status: "RECEIVED",
      productIds: ctx.apexProductIds.slice(0, 4),
      daysAgoCreated: 30,
      receivedDaysAgo: 20,
    },

    // NovaTech POs
    {
      merchantId: ctx.novatechId,
      supplierId: novaSup0,
      warehouseId: ctx.laxId,
      status: "CONFIRMED",
      productIds: ctx.novatechProductIds.slice(0, 4),
      daysAgoCreated: 5,
    },
    {
      merchantId: ctx.novatechId,
      supplierId: novaSup0,
      warehouseId: ctx.laxId,
      status: "PARTIALLY_RECEIVED",
      productIds: ctx.novatechProductIds.slice(2, 6),
      daysAgoCreated: 20,
      receivedDaysAgo: 12,
    },
    {
      merchantId: ctx.novatechId,
      supplierId: novaSup1,
      warehouseId: ctx.ordId,
      status: "RECEIVED",
      productIds: ctx.novatechProductIds.slice(0, 5),
      daysAgoCreated: 45,
      receivedDaysAgo: 38,
    },
    {
      merchantId: ctx.novatechId,
      supplierId: novaSup1,
      warehouseId: ctx.laxId,
      status: "CANCELLED",
      productIds: ctx.novatechProductIds.slice(4, 8),
      daysAgoCreated: 60,
    },

    // Lumière POs
    {
      merchantId: ctx.lumiereId,
      supplierId: lumSup0,
      warehouseId: ctx.laxId,
      status: "SENT",
      productIds: ctx.lumiereProductIds.slice(0, 4),
      daysAgoCreated: 4,
    },
    {
      merchantId: ctx.lumiereId,
      supplierId: lumSup0,
      warehouseId: ctx.laxId,
      status: "IN_TRANSIT",
      productIds: ctx.lumiereProductIds.slice(3, 7),
      daysAgoCreated: 10,
    },
    {
      merchantId: ctx.lumiereId,
      supplierId: lumSup1,
      warehouseId: ctx.ordId,
      status: "RECEIVED",
      productIds: ctx.lumiereProductIds.slice(0, 6),
      daysAgoCreated: 35,
      receivedDaysAgo: 28,
    },
    {
      merchantId: ctx.lumiereId,
      supplierId: lumSup1,
      warehouseId: ctx.laxId,
      status: "DRAFT",
      productIds: ctx.lumiereProductIds.slice(0, 3),
      daysAgoCreated: 1,
    },
  ];

  for (let i = 0; i < poSpecs.length; i++) {
    const spec = poSpecs[i];
    if (!spec) continue;
    const poNumber = seqRef("PO", i + 1);
    const putawayBinId =
      spec.warehouseId === ctx.laxId
        ? (ctx.laxBins[i * 2] as string)
        : (ctx.ordBins[i * 2] as string);

    const po = await db.purchaseOrder.create({
      data: {
        accountId: ctx.accountId,
        merchantId: spec.merchantId,
        warehouseId: spec.warehouseId,
        supplierId: spec.supplierId,
        poNumber,
        status: spec.status,
        expectedDate: daysAgo(spec.daysAgoCreated - 14),
        receivedAt: spec.receivedDaysAgo ? daysAgo(spec.receivedDaysAgo) : null,
        createdBy: ctx.ownerAccountUserId,
        createdAt: daysAgo(spec.daysAgoCreated),
      },
    });

    const lines = await db.purchaseOrderLine.createManyAndReturn({
      data: spec.productIds.map((productId, li) => ({
        poId: po.id,
        productId,
        orderedQty: randInt(50, 200),
        receivedQty:
          spec.status === "RECEIVED"
            ? randInt(45, 195)
            : spec.status === "PARTIALLY_RECEIVED" && li < 2
              ? randInt(20, 40)
              : 0,
        unitCostCents: randInt(800, 4500),
        createdAt: daysAgo(spec.daysAgoCreated),
      })),
    });

    // Receiving records for received/partially received POs
    if (spec.status === "RECEIVED" || spec.status === "PARTIALLY_RECEIVED") {
      const receivedLines =
        spec.status === "RECEIVED" ? lines : lines.slice(0, 2);
      await db.receivingRecord.createMany({
        data: receivedLines.map((line) => ({
          accountId: ctx.accountId,
          poId: po.id,
          productId: line.productId,
          receivedQty: line.receivedQty,
          putawayBinId,
          receivedBy: ctx.staff1AccountUserId,
          createdAt: daysAgo(spec.receivedDaysAgo ?? 7),
        })),
      });
    }

    // ASN for IN_TRANSIT POs
    if (spec.status === "IN_TRANSIT") {
      await db.purchaseOrderAsn.create({
        data: {
          accountId: ctx.accountId,
          poId: po.id,
          asnNumber: seqRef("ASN", i + 1),
          expectedArrivalDate: daysAgo(-3), // 3 days from now
          status: "SENT",
          createdBy: ctx.ownerAccountUserId,
          createdAt: daysAgo(spec.daysAgoCreated - 2),
        },
      });
    }
  }

  // Two work orders
  await db.workOrder.create({
    data: {
      accountId: ctx.accountId,
      merchantId: ctx.apexId,
      warehouseId: ctx.laxId,
      woNumber: "WO-001",
      type: "KITTING",
      status: "IN_PROGRESS",
      targetQty: 50,
      completedQty: 20,
      outputProductId: ctx.apexProductIds[0] as string,
      outputBinId: ctx.laxBins[0] as string,
      scheduledDate: daysAgo(-1),
      createdBy: ctx.ownerAccountUserId,
      inputLines: {
        create: [
          {
            productId: ctx.apexProductIds[1] as string,
            qtyPerUnit: 1,
            consumedQty: 20,
          },
          {
            productId: ctx.apexProductIds[2] as string,
            qtyPerUnit: 1,
            consumedQty: 20,
          },
        ],
      },
    },
  });

  await db.workOrder.create({
    data: {
      accountId: ctx.accountId,
      merchantId: ctx.novatechId,
      warehouseId: ctx.laxId,
      woNumber: "WO-002",
      type: "BUNDLING",
      status: "PENDING",
      targetQty: 30,
      completedQty: 0,
      scheduledDate: daysAgo(-5),
      createdBy: ctx.ownerAccountUserId,
      inputLines: {
        create: [
          {
            productId: ctx.novatechProductIds[0] as string,
            qtyPerUnit: 1,
            consumedQty: 0,
          },
          {
            productId: ctx.novatechProductIds[1] as string,
            qtyPerUnit: 1,
            consumedQty: 0,
          },
        ],
      },
    },
  });

  return ctx;
}

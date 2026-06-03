import type { PrismaClient } from "../../../../generated/prisma/client";
import type { SeedContext } from "../types";

type ZoneSpec = { name: string; code: string };
type BinSpec = { aisle: string; rack: string; level: string; position: string };

function buildBinSpecs(): BinSpec[] {
  const aisles = ["A", "B", "C", "D"];
  const racks = ["01", "02", "03"];
  const levels = ["01", "02", "03", "04"];
  const positions = ["A", "B", "C"];
  const bins: BinSpec[] = [];
  for (const aisle of aisles) {
    for (const rack of racks) {
      for (const level of levels) {
        for (const position of positions) {
          bins.push({ aisle, rack, level, position });
          if (bins.length >= 48) return bins;
        }
      }
    }
  }
  return bins;
}

async function createWarehouse(
  db: PrismaClient,
  accountId: string,
  data: {
    name: string;
    code: string;
    addressLine1: string;
    city: string;
    state: string;
    zip: string;
    timezone: string;
  },
  zones: ZoneSpec[],
): Promise<{ warehouseId: string; binIds: string[] }> {
  const warehouse = await db.warehouse.create({
    data: {
      accountId,
      name: data.name,
      code: data.code,
      addressLine1: data.addressLine1,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: "US",
      timezone: data.timezone,
      isActive: true,
    },
  });

  const binSpecs = buildBinSpecs();
  const binIds: string[] = [];

  for (const zone of zones) {
    const z = await db.zone.create({
      data: { warehouseId: warehouse.id, name: zone.name, code: zone.code },
    });

    const zoneBindSpecs = binSpecs.splice(0, 12);
    for (const spec of zoneBindSpecs) {
      const label = `${spec.aisle}-${spec.rack}-${spec.level}-${spec.position}`;
      const bin = await db.bin.create({
        data: {
          zoneId: z.id,
          warehouseId: warehouse.id,
          label,
          aisle: spec.aisle,
          rack: spec.rack,
          level: spec.level,
          position: spec.position,
          isActive: true,
        },
      });
      binIds.push(bin.id);
    }
  }

  return { warehouseId: warehouse.id, binIds };
}

export async function seedWarehouses(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const zones: ZoneSpec[] = [
    { name: "Receiving", code: "RCV" },
    { name: "Bulk Storage", code: "BLK" },
    { name: "Pick Face", code: "PCK" },
    { name: "Returns", code: "RET" },
  ];

  const [lax, ord] = await Promise.all([
    createWarehouse(
      db,
      ctx.accountId,
      {
        name: "Los Angeles Fulfillment Center",
        code: "LAX",
        addressLine1: "1234 Industrial Blvd",
        city: "Los Angeles",
        state: "CA",
        zip: "90058",
        timezone: "America/Los_Angeles",
      },
      zones,
    ),
    createWarehouse(
      db,
      ctx.accountId,
      {
        name: "Chicago Distribution Hub",
        code: "ORD",
        addressLine1: "5678 Logistics Way",
        city: "Chicago",
        state: "IL",
        zip: "60638",
        timezone: "America/Chicago",
      },
      zones,
    ),
  ]);

  // Assign manager and staff to both warehouses
  await Promise.all([
    db.warehouseManager.create({
      data: {
        accountId: ctx.accountId,
        userId: ctx.managerAccountUserId,
        warehouseId: lax.warehouseId,
        assignedBy: ctx.ownerAccountUserId,
      },
    }),
    db.warehouseManager.create({
      data: {
        accountId: ctx.accountId,
        userId: ctx.managerAccountUserId,
        warehouseId: ord.warehouseId,
        assignedBy: ctx.ownerAccountUserId,
      },
    }),
    db.warehouseStaffAssignment.create({
      data: {
        accountId: ctx.accountId,
        userId: ctx.staff1AccountUserId,
        warehouseId: lax.warehouseId,
        permissions: ["PICK", "PACK", "RECEIVE"],
        assignedBy: ctx.ownerAccountUserId,
      },
    }),
    db.warehouseStaffAssignment.create({
      data: {
        accountId: ctx.accountId,
        userId: ctx.staff2AccountUserId,
        warehouseId: ord.warehouseId,
        permissions: ["PICK", "PACK", "RECEIVE"],
        assignedBy: ctx.ownerAccountUserId,
      },
    }),
  ]);

  return {
    ...ctx,
    laxId: lax.warehouseId,
    ordId: ord.warehouseId,
    laxBins: lax.binIds,
    ordBins: ord.binIds,
  };
}

import type { PrismaClient } from "../../../../generated/prisma/client";
import type { SeedContext } from "../types";

export async function seedSuppliers(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const suppliers = await db.supplier.createManyAndReturn({
    data: [
      // Apex suppliers
      {
        accountId: ctx.accountId,
        name: "Sportswear Direct Ltd",
        email: "orders@sportswear-direct.demo",
        leadTimeDays: 14,
        isActive: true,
      },
      {
        accountId: ctx.accountId,
        name: "FastThread Manufacturing",
        email: "supply@fastthread.demo",
        leadTimeDays: 21,
        isActive: true,
      },
      // NovaTech suppliers
      {
        accountId: ctx.accountId,
        name: "Pacific Electronics Corp",
        email: "wholesale@pacific-elec.demo",
        leadTimeDays: 10,
        isActive: true,
      },
      {
        accountId: ctx.accountId,
        name: "TechSource Distribution",
        email: "ops@techsource.demo",
        leadTimeDays: 7,
        isActive: true,
      },
      // Lumière suppliers
      {
        accountId: ctx.accountId,
        name: "BeautyIngredients Co",
        email: "orders@beautyingredients.demo",
        leadTimeDays: 18,
        isActive: true,
      },
      {
        accountId: ctx.accountId,
        name: "EcoPackaging Solutions",
        email: "supply@ecopack.demo",
        leadTimeDays: 12,
        isActive: true,
      },
    ],
  });

  const [s0, s1, s2, s3, s4, s5] = suppliers;

  return {
    ...ctx,
    apexSupplierIds: [s0?.id ?? "", s1?.id ?? ""],
    novatechSupplierIds: [s2?.id ?? "", s3?.id ?? ""],
    lumiereSupplierIds: [s4?.id ?? "", s5?.id ?? ""],
  };
}

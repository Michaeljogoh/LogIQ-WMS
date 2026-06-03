import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo } from "../helpers";
import type { SeedContext } from "../types";

async function createMerchantWithContract(
  db: PrismaClient,
  accountId: string,
  merchantData: { name: string; email: string },
) {
  const merchant = await db.merchant.create({
    data: {
      accountId,
      name: merchantData.name,
      email: merchantData.email,
      isActive: true,
    },
  });

  const contract = await db.merchantContract.create({
    data: {
      accountId,
      merchantId: merchant.id,
      paymentPeriod: "MONTHLY",
      currency: "USD",
      startDate: daysAgo(180),
      isActive: true,
    },
  });

  await db.feeRule.createMany({
    data: [
      {
        accountId,
        contractId: contract.id,
        feeType: "STORAGE_PER_UNIT_DAY",
        rateCents: 5,
        unitLabel: "unit/day",
        includedUnits: 0,
      },
      {
        accountId,
        contractId: contract.id,
        feeType: "PICK_INITIAL",
        rateCents: 125,
        unitLabel: "shipment",
        includedUnits: 0,
      },
      {
        accountId,
        contractId: contract.id,
        feeType: "PICK_ADDITIONAL",
        rateCents: 25,
        unitLabel: "item",
        includedUnits: 1,
      },
      {
        accountId,
        contractId: contract.id,
        feeType: "PACKING_PER_SHIPMENT",
        rateCents: 100,
        unitLabel: "shipment",
        includedUnits: 0,
      },
      {
        accountId,
        contractId: contract.id,
        feeType: "RECEIVING_PER_PO",
        rateCents: 1500,
        unitLabel: "PO",
        includedUnits: 0,
      },
      {
        accountId,
        contractId: contract.id,
        feeType: "RETURN_PROCESSING",
        rateCents: 350,
        unitLabel: "return",
        includedUnits: 0,
      },
    ],
  });

  await db.sLARule.createMany({
    data: [
      {
        accountId,
        contractId: contract.id,
        metric: "order_fulfillment",
        thresholdMins: 1440,
        warningPct: 90,
        isActive: true,
      },
      {
        accountId,
        contractId: contract.id,
        metric: "receiving",
        thresholdMins: 480,
        warningPct: 80,
        isActive: true,
      },
    ],
  });

  return { merchantId: merchant.id, contractId: contract.id };
}

export async function seedMerchants(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const [apex, novatech, lumiere] = await Promise.all([
    createMerchantWithContract(db, ctx.accountId, {
      name: "Apex Sportswear Inc.",
      email: "ops@apexsportswear.demo",
    }),
    createMerchantWithContract(db, ctx.accountId, {
      name: "NovaTech Electronics",
      email: "logistics@novatech.demo",
    }),
    createMerchantWithContract(db, ctx.accountId, {
      name: "Lumière Cosmetics",
      email: "fulfillment@lumiere.demo",
    }),
  ]);

  await db.merchantUser.createMany({
    data: [
      {
        accountId: ctx.accountId,
        merchantId: apex.merchantId,
        betterAuthUserId: ctx.merchantOwnerAuthUserId,
        systemRole: "MERCHANT_OWNER",
        permissions: [],
        email: "merchant@apexsportswear.demo",
        firstName: "Alex",
        lastName: "Rivera",
        invitedBy: ctx.ownerAccountUserId,
      },
      {
        accountId: ctx.accountId,
        merchantId: apex.merchantId,
        betterAuthUserId: ctx.merchantUserAuthUserId,
        systemRole: "MERCHANT_USER",
        permissions: ["READ", "WRITE"],
        email: "user@apexsportswear.demo",
        firstName: "Jordan",
        lastName: "Lee",
        invitedBy: ctx.ownerAccountUserId,
      },
    ],
  });

  return {
    ...ctx,
    apexId: apex.merchantId,
    novatechId: novatech.merchantId,
    lumiereId: lumiere.merchantId,
    apexContractId: apex.contractId,
    novatechContractId: novatech.contractId,
    lumiereContractId: lumiere.contractId,
  };
}

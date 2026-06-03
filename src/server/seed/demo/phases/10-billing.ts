import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt } from "../helpers";
import type { SeedContext } from "../types";

type InvoiceStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "SENT"
  | "PAID"
  | "OVERDUE"
  | "DISPUTED";

type InvoiceSpec = {
  merchantId: string;
  contractId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  periodStartDays: number;
  periodEndDays: number;
  withDispute?: boolean;
};

export async function seedBilling(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const specs: InvoiceSpec[] = [
    // Apex
    {
      merchantId: ctx.apexId,
      contractId: ctx.apexContractId,
      invoiceNumber: "INV-2024-001",
      status: "PAID",
      periodStartDays: 90,
      periodEndDays: 60,
    },
    {
      merchantId: ctx.apexId,
      contractId: ctx.apexContractId,
      invoiceNumber: "INV-2024-004",
      status: "SENT",
      periodStartDays: 60,
      periodEndDays: 30,
    },
    // NovaTech
    {
      merchantId: ctx.novatechId,
      contractId: ctx.novatechContractId,
      invoiceNumber: "INV-2024-002",
      status: "PAID",
      periodStartDays: 90,
      periodEndDays: 60,
    },
    {
      merchantId: ctx.novatechId,
      contractId: ctx.novatechContractId,
      invoiceNumber: "INV-2024-005",
      status: "OVERDUE",
      periodStartDays: 60,
      periodEndDays: 30,
      withDispute: true,
    },
    // Lumière
    {
      merchantId: ctx.lumiereId,
      contractId: ctx.lumiereContractId,
      invoiceNumber: "INV-2024-003",
      status: "PAID",
      periodStartDays: 90,
      periodEndDays: 60,
    },
    {
      merchantId: ctx.lumiereId,
      contractId: ctx.lumiereContractId,
      invoiceNumber: "INV-2024-006",
      status: "PENDING_REVIEW",
      periodStartDays: 30,
      periodEndDays: 0,
    },
  ];

  const invoiceIds: string[] = [];

  const feeTypes = [
    "STORAGE_PER_UNIT_DAY",
    "PICK_INITIAL",
    "PICK_ADDITIONAL",
    "PACKING_PER_SHIPMENT",
    "RECEIVING_PER_PO",
    "RETURN_PROCESSING",
  ] as const;

  for (const spec of specs) {
    const lines = feeTypes.map((feeType, li) => {
      const unitCount = randInt(20, 800);
      const unitRateCents = [5, 125, 25, 100, 1500, 350][li] ?? 100;
      return {
        feeType,
        description: feeType.replace(/_/g, " ").toLowerCase(),
        unitCount,
        unitRateCents,
        totalCents: unitCount * unitRateCents,
      };
    });

    const totalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);

    const invoice = await db.invoice.create({
      data: {
        accountId: ctx.accountId,
        merchantId: spec.merchantId,
        contractId: spec.contractId,
        invoiceNumber: spec.invoiceNumber,
        periodStart: daysAgo(spec.periodStartDays),
        periodEnd: daysAgo(spec.periodEndDays),
        status: spec.status,
        totalCents,
        anomalyFlags:
          spec.status === "OVERDUE"
            ? ({ highStorageVolume: true } as object)
            : undefined,
        lines: {
          create: lines.map((l) => ({
            accountId: ctx.accountId,
            feeType: l.feeType,
            description: l.description,
            unitCount: l.unitCount,
            unitRateCents: l.unitRateCents,
            totalCents: l.totalCents,
          })),
        },
      },
    });

    invoiceIds.push(invoice.id);

    if (spec.withDispute) {
      await db.invoiceDispute.create({
        data: {
          accountId: ctx.accountId,
          invoiceId: invoice.id,
          submittedBy: ctx.ownerAccountUserId,
          reason:
            "Storage fee calculation appears incorrect — unit counts do not match our inventory records for the period.",
          status: "OPEN",
        },
      });
    }
  }

  return { ...ctx, invoiceIds };
}

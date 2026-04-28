import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

function subtotalWithIncludedUnits(unitCount: number, rateCents: number, includedUnits: number) {
  const billable = Math.max(0, unitCount - includedUnits);
  return { billable, totalCents: billable * rateCents };
}

export const invoiceRouter = createTRPCRouter({
  listByMerchant: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "MERCHANT_OWNER",
        "MERCHANT_USER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ merchantId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.invoice.findMany({
        where: { accountId, merchantId: input.merchantId },
        include: {
          lines: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "MERCHANT_OWNER",
        "MERCHANT_USER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ invoiceId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.invoiceId, accountId },
        include: {
          merchant: { select: { id: true, name: true, email: true } },
          lines: true,
          contract: {
            include: {
              feeRules: true,
              slaRules: true,
            },
          },
        },
      });
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found." });
      }
      return invoice;
    }),

  generate: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        merchantId: z.string().cuid(),
        periodStart: z.coerce.date(),
        periodEnd: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const year = input.periodEnd.getUTCFullYear();
      return ctx.db.$transaction(async (tx) => {
        const contract = await tx.merchantContract.findFirst({
          where: { accountId, merchantId: input.merchantId, isActive: true },
          include: { feeRules: true },
        });
        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active merchant contract not found.",
          });
        }

        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${`inv_seq:${accountId}:${year}`}));
        `;
        const rows = await tx.$queryRaw<{ next_seq: number }[]>`
          SELECT COALESCE(MAX(CAST(split_part("invoiceNumber", '-', 3) AS INTEGER)), 0) + 1 AS next_seq
          FROM invoice
          WHERE "accountId" = ${accountId}
            AND "invoiceNumber" LIKE ${`INV-${year}-%`}
        `;
        const invoiceNumber = `INV-${year}-${String(rows[0]?.next_seq ?? 1).padStart(6, "0")}`;

        const [storageUnits, poCount, receivedUnits, shipments, returns] = await tx.$transaction([
          tx.stockLevel.aggregate({
            _sum: { quantity: true },
            where: {
              accountId,
              product: { merchantId: input.merchantId },
            },
          }),
          tx.purchaseOrder.count({
            where: {
              accountId,
              merchantId: input.merchantId,
              createdAt: { gte: input.periodStart, lte: input.periodEnd },
            },
          }),
          tx.receivingRecord.aggregate({
            _sum: { receivedQty: true },
            where: {
              accountId,
              po: {
                merchantId: input.merchantId,
              },
              createdAt: { gte: input.periodStart, lte: input.periodEnd },
            },
          }),
          tx.shipment.count({
            where: {
              accountId,
              status: { not: "VOIDED" },
              order: { merchantId: input.merchantId },
              createdAt: { gte: input.periodStart, lte: input.periodEnd },
            },
          }),
          tx.orderLine.count({
            where: {
              order: {
                accountId,
                merchantId: input.merchantId,
                createdAt: { gte: input.periodStart, lte: input.periodEnd },
              },
            },
          }),
        ]);

        const storageUnitsCount = storageUnits._sum.quantity ?? 0;
        const receivingUnitsCount = receivedUnits._sum.receivedQty ?? 0;

        const invoiceLineData: Array<{
          feeType:
            | "STORAGE_PER_UNIT_DAY"
            | "PICK_INITIAL"
            | "PICK_ADDITIONAL"
            | "RECEIVING_PER_PO"
            | "RECEIVING_PER_UNIT"
            | "PACKING_PER_SHIPMENT"
            | "LABEL_PER_SHIPMENT"
            | "RETURN_PROCESSING"
            | "SPECIAL_HANDLING"
            | "STORAGE_PER_PALLET_DAY";
          description: string;
          unitCount: number;
          unitRateCents: number;
          totalCents: number;
        }> = [];

        for (const rule of contract.feeRules) {
          let unitCount = 0;
          if (rule.feeType === "STORAGE_PER_UNIT_DAY") {
            const days = Math.max(
              1,
              Math.ceil(
                (input.periodEnd.getTime() - input.periodStart.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            );
            unitCount = storageUnitsCount * days;
          } else if (rule.feeType === "PICK_INITIAL") {
            unitCount = shipments;
          } else if (rule.feeType === "PICK_ADDITIONAL") {
            unitCount = Math.max(0, returns - shipments);
          } else if (rule.feeType === "RECEIVING_PER_PO") {
            unitCount = poCount;
          } else if (rule.feeType === "RECEIVING_PER_UNIT") {
            unitCount = receivingUnitsCount;
          } else if (rule.feeType === "PACKING_PER_SHIPMENT") {
            unitCount = shipments;
          } else if (rule.feeType === "LABEL_PER_SHIPMENT") {
            unitCount = shipments;
          } else if (rule.feeType === "RETURN_PROCESSING") {
            unitCount = returns;
          }
          const { billable, totalCents } = subtotalWithIncludedUnits(
            unitCount,
            rule.rateCents,
            rule.includedUnits,
          );
          if (billable === 0) {
            continue;
          }
          invoiceLineData.push({
            feeType: rule.feeType,
            description: `${rule.feeType} (${rule.unitLabel})`,
            unitCount: billable,
            unitRateCents: rule.rateCents,
            totalCents,
          });
        }

        const totalCents = invoiceLineData.reduce((sum, line) => sum + line.totalCents, 0);
        const anomalyFlags = {
          generatedAt: new Date().toISOString(),
          flags: [],
        };

        return tx.invoice.create({
          data: {
            accountId,
            merchantId: input.merchantId,
            contractId: contract.id,
            invoiceNumber,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            status: "PENDING_REVIEW",
            totalCents,
            anomalyFlags,
            lines: {
              create: invoiceLineData.map((line) => ({
                accountId,
                feeType: line.feeType,
                description: line.description,
                unitCount: line.unitCount,
                unitRateCents: line.unitRateCents,
                totalCents: line.totalCents,
              })),
            },
          },
          include: { lines: true },
        });
      });
    }),

  dispute: protectedProc
    .use(
      requireRole(
        "MERCHANT_OWNER",
        "MERCHANT_USER",
        "THREEPL_ACCOUNT_OWNER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        invoiceId: z.string().cuid(),
        reason: z.string().trim().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const existing = await ctx.db.invoice.findFirst({
        where: { id: input.invoiceId, accountId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found." });
      }
      return ctx.db.invoice.update({
        where: { id: existing.id },
        data: {
          status: "DISPUTED",
          anomalyFlags: {
            reason: input.reason,
            disputedAt: new Date().toISOString(),
          },
        },
      });
    }),
});

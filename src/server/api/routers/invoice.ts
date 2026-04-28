import { TRPCError } from "@trpc/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { putObject } from "@/lib/s3";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

function subtotalWithIncludedUnits(
  unitCount: number,
  rateCents: number,
  includedUnits: number,
) {
  const billable = Math.max(0, unitCount - includedUnits);
  return { billable, totalCents: billable * rateCents };
}

function isMerchantPortalRole(systemRole: string | null) {
  return systemRole === "MERCHANT_OWNER" || systemRole === "MERCHANT_USER";
}

type BillingAnomaly = {
  severity: "INFO" | "WARNING" | "CRITICAL";
  type:
    | "QUANTITY_MISMATCH"
    | "VACATED_BIN_STORAGE"
    | "RATE_MISMATCH"
    | "DUPLICATE_CHARGE"
    | "UNUSUAL_TOTAL";
  description: string;
  expectedValue?: string;
  actualValue?: string;
};

function buildBillingAnomalyFlags(args: {
  lineItemsTotal: number;
  invoiceTotal: number;
  storageUnitsCount: number;
  storageRuleApplied: boolean;
  duplicateInvoiceExists: boolean;
  contractRateMap: Map<string, number>;
  invoiceLineData: Array<{ feeType: string; unitRateCents: number }>;
  priorInvoiceTotals: number[];
}) {
  const flags: BillingAnomaly[] = [];

  if (args.lineItemsTotal !== args.invoiceTotal) {
    flags.push({
      severity: "CRITICAL",
      type: "QUANTITY_MISMATCH",
      description: "Invoice total does not equal the sum of invoice lines.",
      expectedValue: String(args.lineItemsTotal),
      actualValue: String(args.invoiceTotal),
    });
  }

  if (args.storageRuleApplied && args.storageUnitsCount <= 0) {
    flags.push({
      severity: "WARNING",
      type: "VACATED_BIN_STORAGE",
      description:
        "Storage fee is applied while merchant has zero stock units.",
      expectedValue: "No storage fee",
      actualValue: "Storage fee line present",
    });
  }

  for (const line of args.invoiceLineData) {
    const expectedRate = args.contractRateMap.get(line.feeType);
    if (
      typeof expectedRate === "number" &&
      expectedRate !== line.unitRateCents
    ) {
      flags.push({
        severity: "CRITICAL",
        type: "RATE_MISMATCH",
        description: `Rate mismatch for ${line.feeType}.`,
        expectedValue: String(expectedRate),
        actualValue: String(line.unitRateCents),
      });
    }
  }

  if (args.duplicateInvoiceExists) {
    flags.push({
      severity: "CRITICAL",
      type: "DUPLICATE_CHARGE",
      description: "Another invoice exists for overlapping period.",
    });
  }

  if (args.priorInvoiceTotals.length >= 2) {
    const avg =
      args.priorInvoiceTotals.reduce((sum, value) => sum + value, 0) /
      args.priorInvoiceTotals.length;
    if (avg > 0 && args.invoiceTotal > Math.round(avg * 1.15)) {
      flags.push({
        severity: "WARNING",
        type: "UNUSUAL_TOTAL",
        description:
          "Invoice total is more than 15% above merchant historical average.",
        expectedValue: `<= ${Math.round(avg * 1.15)}`,
        actualValue: String(args.invoiceTotal),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    flags,
  };
}

async function renderInvoicePdf(args: {
  invoiceNumber: string;
  merchantName: string;
  periodStart: Date;
  periodEnd: Date;
  lines: Array<{
    description: string;
    unitCount: number;
    unitRateCents: number;
    totalCents: number;
  }>;
  totalCents: number;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let y = 760;
  page.drawText(`Invoice ${args.invoiceNumber}`, { x: 40, y, size: 18, font });
  y -= 24;
  page.drawText(`Merchant: ${args.merchantName}`, { x: 40, y, size: 11, font });
  y -= 16;
  page.drawText(
    `Period: ${args.periodStart.toISOString().slice(0, 10)} -> ${args.periodEnd.toISOString().slice(0, 10)}`,
    { x: 40, y, size: 11, font },
  );
  y -= 24;
  for (const line of args.lines) {
    if (y < 80) {
      break;
    }
    page.drawText(
      `${line.description} | units: ${line.unitCount} | rate: $${(line.unitRateCents / 100).toFixed(2)} | total: $${(line.totalCents / 100).toFixed(2)}`,
      { x: 40, y, size: 10, font },
    );
    y -= 14;
  }
  y -= 12;
  page.drawText(`Total: $${(args.totalCents / 100).toFixed(2)}`, {
    x: 40,
    y,
    size: 12,
    font,
  });
  return Buffer.from(await pdf.save());
}

export const invoiceRouter = createTRPCRouter({
  listMine: protectedProc
    .use(requireRole("MERCHANT_OWNER", "MERCHANT_USER", "PLATFORM_ADMIN"))
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      if (!ctx.merchantId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Merchant context is required.",
        });
      }
      return ctx.db.invoice.findMany({
        where: { accountId, merchantId: ctx.merchantId },
        include: { lines: true, disputes: true },
        orderBy: { createdAt: "desc" },
      });
    }),

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
      const merchantId = isMerchantPortalRole(ctx.systemRole)
        ? ctx.merchantId
        : input.merchantId;
      if (!merchantId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Merchant context is required.",
        });
      }
      if (
        isMerchantPortalRole(ctx.systemRole) &&
        merchantId !== input.merchantId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Merchant users can only access their own invoices.",
        });
      }
      return ctx.db.invoice.findMany({
        where: { accountId, merchantId },
        include: {
          lines: true,
          disputes: true,
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
          disputes: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }
      if (
        isMerchantPortalRole(ctx.systemRole) &&
        ctx.merchantId &&
        invoice.merchantId !== ctx.merchantId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Merchant users can only access their own invoices.",
        });
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
      const generated = await ctx.db.$transaction(async (tx) => {
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

        const [
          storageUnits,
          poCount,
          receivedUnits,
          shipments,
          returnedShipments,
          shippedOrders,
        ] = await tx.$transaction([
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
          tx.shipment.count({
            where: {
              accountId,
              status: "RETURNED",
              order: { merchantId: input.merchantId },
              createdAt: { gte: input.periodStart, lte: input.periodEnd },
            },
          }),
          tx.order.findMany({
            where: {
              accountId,
              merchantId: input.merchantId,
              shipments: {
                some: {
                  createdAt: { gte: input.periodStart, lte: input.periodEnd },
                  status: { not: "VOIDED" },
                },
              },
            },
            select: {
              id: true,
              lines: {
                select: {
                  quantity: true,
                },
              },
            },
          }),
        ]);

        const storageUnitsCount = storageUnits._sum.quantity ?? 0;
        const receivingUnitsCount = receivedUnits._sum.receivedQty ?? 0;
        const shippedOrderLineItems = shippedOrders.reduce((sum, order) => {
          const orderItems = order.lines.reduce(
            (lineSum, line) => lineSum + line.quantity,
            0,
          );
          return sum + orderItems;
        }, 0);

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
            unitCount = Math.max(0, shippedOrderLineItems - shipments);
          } else if (rule.feeType === "RECEIVING_PER_PO") {
            unitCount = poCount;
          } else if (rule.feeType === "RECEIVING_PER_UNIT") {
            unitCount = receivingUnitsCount;
          } else if (rule.feeType === "PACKING_PER_SHIPMENT") {
            unitCount = shipments;
          } else if (rule.feeType === "LABEL_PER_SHIPMENT") {
            unitCount = shipments;
          } else if (rule.feeType === "RETURN_PROCESSING") {
            unitCount = returnedShipments;
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

        const totalCents = invoiceLineData.reduce(
          (sum, line) => sum + line.totalCents,
          0,
        );
        const contractRateMap = new Map(
          contract.feeRules.map((rule) => [rule.feeType, rule.rateCents]),
        );
        const overlappingInvoice = await tx.invoice.findFirst({
          where: {
            accountId,
            merchantId: input.merchantId,
            OR: [
              {
                periodStart: { lte: input.periodEnd },
                periodEnd: { gte: input.periodStart },
              },
            ],
          },
          select: { id: true },
        });
        const priorInvoices = await tx.invoice.findMany({
          where: {
            accountId,
            merchantId: input.merchantId,
            createdAt: { lt: new Date() },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { totalCents: true },
        });
        const anomalyFlags = buildBillingAnomalyFlags({
          lineItemsTotal: totalCents,
          invoiceTotal: totalCents,
          storageUnitsCount,
          storageRuleApplied: invoiceLineData.some(
            (line) => line.feeType === "STORAGE_PER_UNIT_DAY",
          ),
          duplicateInvoiceExists: Boolean(overlappingInvoice),
          contractRateMap,
          invoiceLineData: invoiceLineData.map((line) => ({
            feeType: line.feeType,
            unitRateCents: line.unitRateCents,
          })),
          priorInvoiceTotals: priorInvoices.map(
            (invoice) => invoice.totalCents,
          ),
        });

        const invoice = await tx.invoice.create({
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
        return {
          invoice,
          merchantId: input.merchantId,
        };
      });
      const merchant = await ctx.db.merchant.findFirst({
        where: { id: generated.merchantId, accountId },
        select: { name: true },
      });
      if (merchant) {
        const pdfBuffer = await renderInvoicePdf({
          invoiceNumber: generated.invoice.invoiceNumber,
          merchantName: merchant.name,
          periodStart: generated.invoice.periodStart,
          periodEnd: generated.invoice.periodEnd,
          lines: generated.invoice.lines.map((line) => ({
            description: line.description,
            unitCount: line.unitCount,
            unitRateCents: line.unitRateCents,
            totalCents: line.totalCents,
          })),
          totalCents: generated.invoice.totalCents,
        });
        const key = `${accountId}/invoices/${generated.invoice.id}.pdf`;
        const uploaded = await putObject({
          key,
          body: pdfBuffer,
          contentType: "application/pdf",
        });
        return ctx.db.invoice.update({
          where: { id: generated.invoice.id },
          data: { pdfUrl: uploaded.url },
          include: { lines: true, disputes: true },
        });
      }
      return generated.invoice;
    }),

  estimateMine: protectedProc
    .use(requireRole("MERCHANT_OWNER", "MERCHANT_USER", "PLATFORM_ADMIN"))
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      if (!ctx.merchantId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Merchant context is required.",
        });
      }

      const now = new Date();
      const periodStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const periodEnd = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      );

      const contract = await ctx.db.merchantContract.findFirst({
        where: {
          accountId,
          merchantId: ctx.merchantId,
          isActive: true,
        },
        include: { feeRules: true },
      });
      if (!contract) {
        return null;
      }

      const [shipments, poCount] = await ctx.db.$transaction([
        ctx.db.shipment.count({
          where: {
            accountId,
            status: { not: "VOIDED" },
            order: { merchantId: ctx.merchantId },
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        ctx.db.purchaseOrder.count({
          where: {
            accountId,
            merchantId: ctx.merchantId,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
      ]);

      const estimateCents = contract.feeRules.reduce((sum, rule) => {
        if (
          rule.feeType === "PACKING_PER_SHIPMENT" ||
          rule.feeType === "LABEL_PER_SHIPMENT"
        ) {
          return (
            sum + Math.max(0, shipments - rule.includedUnits) * rule.rateCents
          );
        }
        if (rule.feeType === "RECEIVING_PER_PO") {
          return (
            sum + Math.max(0, poCount - rule.includedUnits) * rule.rateCents
          );
        }
        return sum;
      }, 0);

      return {
        periodStart,
        periodEnd,
        estimateCents,
        shipmentCount: shipments,
        poCount,
      };
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
        select: { id: true, merchantId: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }
      if (
        isMerchantPortalRole(ctx.systemRole) &&
        ctx.merchantId &&
        existing.merchantId !== ctx.merchantId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Merchant users can only dispute their own invoices.",
        });
      }
      await ctx.db.invoiceDispute.create({
        data: {
          accountId,
          invoiceId: existing.id,
          submittedBy: ctx.userId ?? "unknown",
          reason: input.reason,
          status: "OPEN",
        },
      });
      return ctx.db.invoice.update({
        where: { id: existing.id },
        data: {
          status: "DISPUTED",
          anomalyFlags: {
            reason: input.reason,
            disputedAt: new Date().toISOString(),
          },
        },
        include: {
          disputes: true,
        },
      });
    }),
});

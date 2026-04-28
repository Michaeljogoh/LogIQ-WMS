import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

const poLineInput = z.object({
  productId: z.string().cuid(),
  orderedQty: z.number().int().positive(),
  unitCostCents: z.number().int().min(0).optional().nullable(),
  lotNumber: z.string().min(1).optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
});

const createPurchaseOrderInput = z.object({
  merchantId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  supplierId: z.string().cuid(),
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  lines: z.array(poLineInput).min(1),
  sendNow: z.boolean().optional(),
});

const receiveScanInput = z
  .object({
    poId: z.string().cuid(),
    poLineId: z.string().cuid().optional(),
    scannedBarcode: z.string().trim().min(1).optional(),
    scannedQty: z.number().int().positive(),
    putawayBinId: z.string().cuid(),
    discrepancyNote: z.string().trim().max(500).optional().nullable(),
    overrideOverReceive: z.boolean().optional(),
    lotNumber: z.string().min(1).optional().nullable(),
    expiryDate: z.coerce.date().optional().nullable(),
  })
  .refine((value) => Boolean(value.poLineId || value.scannedBarcode), {
    message: "Provide poLineId or scannedBarcode.",
  });

const createAsnInput = z.object({
  poId: z.string().cuid(),
  asnNumber: z.string().trim().min(1),
  expectedArrivalDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const purchaseOrderRouter = createTRPCRouter({
  list: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        status: z
          .enum([
            "DRAFT",
            "SENT",
            "CONFIRMED",
            "IN_TRANSIT",
            "PARTIALLY_RECEIVED",
            "RECEIVED",
            "CANCELLED",
          ])
          .optional(),
        merchantId: z.string().cuid().optional(),
        supplierId: z.string().cuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.purchaseOrder.findMany({
        where: {
          accountId,
          ...(input.status ? { status: input.status } : {}),
          ...(input.merchantId ? { merchantId: input.merchantId } : {}),
          ...(input.supplierId ? { supplierId: input.supplierId } : {}),
        },
        include: {
          merchant: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      });
    }),

  getById: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ poId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const purchaseOrder = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.poId, accountId },
        include: {
          supplier: true,
          merchant: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, barcode: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          receivingRecords: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          asns: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!purchaseOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found.",
        });
      }
      return purchaseOrder;
    }),

  create: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(createPurchaseOrderInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const year = new Date().getUTCFullYear();

      const [merchant, warehouse, supplier, products] =
        await ctx.db.$transaction([
          ctx.db.merchant.findFirst({
            where: { id: input.merchantId, accountId },
            select: { id: true },
          }),
          ctx.db.warehouse.findFirst({
            where: { id: input.warehouseId, accountId },
            select: { id: true },
          }),
          ctx.db.supplier.findFirst({
            where: { id: input.supplierId, accountId },
            select: { id: true },
          }),
          ctx.db.product.findMany({
            where: {
              accountId,
              merchantId: input.merchantId,
              id: { in: input.lines.map((line) => line.productId) },
            },
            select: { id: true },
          }),
        ]);

      if (!merchant || !warehouse || !supplier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant, warehouse, or supplier not found.",
        });
      }
      if (
        products.length !==
        new Set(input.lines.map((line) => line.productId)).size
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more products were not found for this merchant.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${`po_seq:${accountId}:${year}`}));
        `;

        const nextSeqRows = await tx.$queryRaw<{ next_seq: number }[]>`
          SELECT COALESCE(MAX(CAST(split_part("poNumber", '-', 3) AS INTEGER)), 0) + 1 AS next_seq
          FROM purchase_order
          WHERE "accountId" = ${accountId}
            AND "poNumber" LIKE ${`PO-${year}-%`}
        `;
        const nextSeq = nextSeqRows[0]?.next_seq ?? 1;
        const poNumber = `PO-${year}-${String(nextSeq).padStart(6, "0")}`;

        return tx.purchaseOrder.create({
          data: {
            accountId,
            merchantId: input.merchantId,
            warehouseId: input.warehouseId,
            supplierId: input.supplierId,
            poNumber,
            status: input.sendNow ? "SENT" : "DRAFT",
            expectedDate: input.expectedDate ?? null,
            notes: input.notes ?? null,
            createdBy: userId,
            lines: {
              create: input.lines.map((line) => ({
                productId: line.productId,
                orderedQty: line.orderedQty,
                unitCostCents: line.unitCostCents ?? null,
                lotNumber: line.lotNumber ?? null,
                expiryDate: line.expiryDate ?? null,
              })),
            },
          },
          include: {
            lines: true,
          },
        });
      });
    }),

  updateStatus: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        poId: z.string().cuid(),
        status: z.enum([
          "DRAFT",
          "SENT",
          "CONFIRMED",
          "IN_TRANSIT",
          "CANCELLED",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const existing = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.poId, accountId },
        select: { id: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found.",
        });
      }
      if (existing.status === "RECEIVED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Received purchase orders cannot be updated.",
        });
      }
      const statusOrder = [
        "DRAFT",
        "SENT",
        "CONFIRMED",
        "IN_TRANSIT",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
      ];
      const currentIndex = statusOrder.indexOf(existing.status);
      const requestedIndex = statusOrder.indexOf(input.status);
      if (
        currentIndex >= 0 &&
        requestedIndex >= 0 &&
        requestedIndex + 1 < currentIndex
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Purchase order status cannot be regressed by more than one step.",
        });
      }
      return ctx.db.purchaseOrder.update({
        where: { id: input.poId },
        data: { status: input.status },
      });
    }),

  createAsn: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(createAsnInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.poId, accountId },
        select: { id: true },
      });
      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found.",
        });
      }
      try {
        return await ctx.db.purchaseOrderAsn.create({
          data: {
            accountId,
            poId: po.id,
            asnNumber: input.asnNumber,
            expectedArrivalDate: input.expectedArrivalDate ?? null,
            notes: input.notes ?? null,
            createdBy: userId,
          },
        });
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error) {
          const prismaError = error as { code?: string };
          if (prismaError.code === "P2002") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "ASN number already exists in this account.",
            });
          }
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  getPutawaySuggestions: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        poId: z.string().cuid(),
        productId: z.string().cuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.poId, accountId },
        select: { id: true, warehouseId: true },
      });
      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found.",
        });
      }

      const bins = await ctx.db.bin.findMany({
        where: {
          warehouseId: po.warehouseId,
          isActive: true,
          warehouse: { accountId },
        },
        include: {
          stockLevels: {
            where: { accountId },
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      const ranked = bins
        .map((bin) => {
          const hasProduct = bin.stockLevels.some(
            (row) => row.productId === input.productId && row.quantity > 0,
          );
          const currentUnits = bin.stockLevels.reduce(
            (sum, row) => sum + row.quantity,
            0,
          );
          return {
            id: bin.id,
            label: bin.label,
            hasProduct,
            currentUnits,
            availableCapacityScore:
              typeof bin.maxWeight === "number"
                ? Math.max(0, bin.maxWeight - currentUnits)
                : Number.MAX_SAFE_INTEGER - currentUnits,
          };
        })
        .sort((a, b) => {
          if (a.hasProduct !== b.hasProduct) {
            return a.hasProduct ? -1 : 1;
          }
          if (a.availableCapacityScore !== b.availableCapacityScore) {
            return b.availableCapacityScore - a.availableCapacityScore;
          }
          return a.label.localeCompare(b.label);
        })
        .slice(0, 3);

      return ranked;
    }),

  receiveScan: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(receiveScanInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      return ctx.db.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findFirst({
          where: { id: input.poId, accountId },
          include: {
            lines: true,
          },
        });
        if (!po) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase order not found.",
          });
        }
        if (po.status === "CANCELLED" || po.status === "RECEIVED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Purchase order is not receivable.",
          });
        }

        let line = po.lines.find((row) => row.id === input.poLineId);
        if (!line && input.scannedBarcode) {
          const matchedLine = await tx.purchaseOrderLine.findFirst({
            where: {
              poId: po.id,
              product: {
                accountId,
                OR: [
                  { barcode: input.scannedBarcode },
                  { sku: input.scannedBarcode },
                ],
              },
            },
            include: {
              product: {
                select: { id: true, barcode: true, sku: true },
              },
            },
            orderBy: { createdAt: "asc" },
          });
          if (matchedLine) {
            line = {
              id: matchedLine.id,
              poId: matchedLine.poId,
              productId: matchedLine.productId,
              orderedQty: matchedLine.orderedQty,
              receivedQty: matchedLine.receivedQty,
              unitCostCents: matchedLine.unitCostCents,
              lotNumber: matchedLine.lotNumber,
              expiryDate: matchedLine.expiryDate,
              createdAt: matchedLine.createdAt,
              updatedAt: matchedLine.updatedAt,
            };
          }
        }
        if (!line) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase order line not found for this scan.",
          });
        }

        const product = await tx.product.findFirst({
          where: { id: line.productId, accountId },
          select: { id: true, lotTracking: true },
        });
        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found.",
          });
        }
        if (product.lotTracking && !(input.lotNumber ?? line.lotNumber)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Lot number is required for lot-tracked products.",
          });
        }

        const limit = Math.floor(line.orderedQty * 1.1);
        if (
          line.receivedQty + input.scannedQty > limit &&
          !input.overrideOverReceive
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Receive quantity exceeds the 10% over-receive threshold. Retry with overrideOverReceive=true.",
          });
        }

        const bin = await tx.bin.findFirst({
          where: {
            id: input.putawayBinId,
            warehouseId: po.warehouseId,
            warehouse: { accountId },
          },
          select: { warehouseId: true },
        });
        if (!bin) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Putaway bin not found.",
          });
        }

        const stock = await tx.stockLevel.findFirst({
          where: {
            accountId,
            productId: line.productId,
            binId: input.putawayBinId,
            lotNumber: input.lotNumber ?? line.lotNumber ?? null,
            serialNumber: null,
          },
        });

        const quantityBefore = stock?.quantity ?? 0;
        const quantityAfter = quantityBefore + input.scannedQty;

        if (stock) {
          await tx.stockLevel.update({
            where: { id: stock.id },
            data: {
              quantity: quantityAfter,
              expiryDate:
                input.expiryDate ?? line.expiryDate ?? stock.expiryDate,
            },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              accountId,
              productId: line.productId,
              binId: input.putawayBinId,
              warehouseId: bin.warehouseId,
              quantity: quantityAfter,
              reservedQty: 0,
              lotNumber: input.lotNumber ?? line.lotNumber ?? null,
              serialNumber: null,
              expiryDate: input.expiryDate ?? line.expiryDate ?? null,
            },
          });
        }

        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: {
            receivedQty: line.receivedQty + input.scannedQty,
            lotNumber: input.lotNumber ?? line.lotNumber ?? null,
            expiryDate: input.expiryDate ?? line.expiryDate ?? null,
          },
        });

        await tx.receivingRecord.create({
          data: {
            accountId,
            poId: po.id,
            productId: line.productId,
            receivedQty: input.scannedQty,
            putawayBinId: input.putawayBinId,
            receivedBy: userId,
            discrepancyNote: input.discrepancyNote ?? null,
          },
        });

        await tx.stockMovement.create({
          data: {
            accountId,
            productId: line.productId,
            warehouseId: po.warehouseId,
            binId: input.putawayBinId,
            type: "INBOUND",
            quantityDelta: input.scannedQty,
            quantityBefore,
            quantityAfter,
            performedBy: userId,
            lotNumber: input.lotNumber ?? line.lotNumber ?? null,
            referenceId: po.id,
            referenceType: "PURCHASE_ORDER",
            reason: "po_receive_scan",
          },
        });

        const refreshedLines = await tx.purchaseOrderLine.findMany({
          where: { poId: po.id },
          select: {
            orderedQty: true,
            receivedQty: true,
          },
        });

        const allReceived = refreshedLines.every(
          (row) => row.receivedQty >= row.orderedQty,
        );
        const anyReceived = refreshedLines.some((row) => row.receivedQty > 0);
        const status = allReceived
          ? "RECEIVED"
          : anyReceived
            ? "PARTIALLY_RECEIVED"
            : po.status;

        const updatedPo = await tx.purchaseOrder.update({
          where: { id: po.id },
          data: {
            status,
            receivedAt: allReceived ? new Date() : po.receivedAt,
          },
          include: {
            lines: true,
          },
        });

        return updatedPo;
      });
    }),
});

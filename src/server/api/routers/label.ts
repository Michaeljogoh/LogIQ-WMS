import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import {
  generateBinLabelAndPersist,
  generatePalletLabelAndPersist,
  generateProductLabelAndPersist,
  presignPdfUrl,
} from "@/server/label/persist";

const operatorRoles = requireRole(
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PLATFORM_ADMIN",
);

export const labelRouter = createTRPCRouter({
  generateProduct: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        productId: z.string().cuid(),
        templateId: z.string().cuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return generateProductLabelAndPersist({
        db: ctx.db,
        accountId,
        productId: input.productId,
        templateId: input.templateId,
      });
    }),

  generateBin: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        binId: z.string().cuid(),
        templateId: z.string().cuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return generateBinLabelAndPersist({
        db: ctx.db,
        accountId,
        binId: input.binId,
        templateId: input.templateId,
      });
    }),

  generatePallet: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        purchaseOrderId: z.string().cuid(),
        palletCode: z.string().min(1).max(64).optional(),
        templateId: z.string().cuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return generatePalletLabelAndPersist({
        db: ctx.db,
        accountId,
        purchaseOrderId: input.purchaseOrderId,
        palletCode: input.palletCode,
        templateId: input.templateId,
      });
    }),

  getByReference: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        referenceType: z.enum(["PRODUCT", "BIN", "PALLET"]),
        referenceId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const rows = await ctx.db.generatedLabel.findMany({
        where: {
          accountId,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
        },
        orderBy: { createdAt: "desc" },
        include: {
          template: { select: { id: true, name: true, type: true } },
        },
        take: 50,
      });

      return Promise.all(
        rows.map(async (row) => ({
          ...row,
          viewUrl: await presignPdfUrl(row.pdfUrl),
        })),
      );
    }),
});

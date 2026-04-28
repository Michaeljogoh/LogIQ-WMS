import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

const supplierCreateInput = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  leadTimeDays: z.number().int().min(1).max(365).default(7),
});

const supplierUpdateInput = z.object({
  supplierId: z.string().cuid(),
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  leadTimeDays: z.number().int().min(1).max(365).optional(),
  isActive: z.boolean().optional(),
});

export const supplierRouter = createTRPCRouter({
  list: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const suppliers = await ctx.db.supplier.findMany({
        where: { accountId },
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
          purchaseOrders: {
            where: {
              status: "RECEIVED",
            },
            select: {
              expectedDate: true,
              receivedAt: true,
            },
          },
        },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      });
      return suppliers.map((supplier) => {
        const eligible = supplier.purchaseOrders.filter(
          (po) => po.expectedDate && po.receivedAt,
        );
        const onTime = eligible.filter(
          (po) =>
            po.expectedDate !== null &&
            po.receivedAt !== null &&
            po.receivedAt <= po.expectedDate,
        ).length;
        return {
          ...supplier,
          onTimeRatePct:
            eligible.length > 0
              ? Math.round((onTime / eligible.length) * 100)
              : null,
        };
      });
    }),

  create: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(supplierCreateInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.supplier.create({
        data: {
          accountId,
          name: input.name,
          email: input.email ?? null,
          leadTimeDays: input.leadTimeDays,
        },
      });
    }),

  update: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(supplierUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const { supplierId, ...data } = input;
      const existing = await ctx.db.supplier.findFirst({
        where: { id: supplierId, accountId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplier not found.",
        });
      }
      return ctx.db.supplier.update({
        where: { id: supplierId },
        data,
      });
    }),
});

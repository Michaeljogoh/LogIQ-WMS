import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { pingPrinterHost } from "@/server/printing/thermal-send";

const operatorRoles = requireRole(
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PLATFORM_ADMIN",
);

export const printerRouter = createTRPCRouter({
  register: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        warehouseId: z.string().cuid(),
        name: z.string().min(1),
        ipAddress: z.string().min(1),
        port: z.number().int().positive().max(65535).optional(),
        labelWidth: z.number().positive().optional(),
        labelHeight: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const warehouse = await ctx.db.warehouse.findFirst({
        where: { id: input.warehouseId, accountId },
      });
      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Warehouse not found.",
        });
      }
      return ctx.db.thermalPrinter.create({
        data: {
          accountId,
          warehouseId: input.warehouseId,
          name: input.name,
          ipAddress: input.ipAddress.trim(),
          port: input.port ?? 9100,
          labelWidth: input.labelWidth ?? 101.6,
          labelHeight: input.labelHeight ?? 152.4,
        },
      });
    }),

  list: protectedProc.use(operatorRoles).query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    return ctx.db.thermalPrinter.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      include: { warehouse: { select: { id: true, name: true, code: true } } },
    });
  }),

  ping: protectedProc
    .use(operatorRoles)
    .input(z.object({ printerId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const printer = await ctx.db.thermalPrinter.findFirst({
        where: { id: input.printerId, accountId },
      });
      if (!printer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Printer not found.",
        });
      }
      const now = new Date();
      try {
        await pingPrinterHost(printer.ipAddress, printer.port);
        return ctx.db.thermalPrinter.update({
          where: { id: printer.id },
          data: { isOnline: true, lastPingAt: now },
        });
      } catch {
        return ctx.db.thermalPrinter.update({
          where: { id: printer.id },
          data: { isOnline: false, lastPingAt: now },
        });
      }
    }),
});

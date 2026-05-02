import { TRPCError } from "@trpc/server";
import pLimit from "p-limit";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import {
  buyShipmentLabel,
  createUspsScanForm,
} from "@/server/integrations/easypost";
import { resolveZplPayload } from "@/server/printing/resolve-zpl";
import { sendRawToPrinter } from "@/server/printing/thermal-send";
import { recordPurchasedLabel } from "@/server/shipment/record-purchased-label";

const operatorRoles = requireRole(
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PLATFORM_ADMIN",
);

export const printQueueRouter = createTRPCRouter({
  list: protectedProc.use(operatorRoles).query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    return ctx.db.printQueue.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        _count: { select: { items: true } },
      },
    });
  }),

  getById: protectedProc
    .use(operatorRoles)
    .input(z.object({ queueId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const queue = await ctx.db.printQueue.findFirst({
        where: { id: input.queueId, accountId },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              order: {
                select: {
                  id: true,
                  channelOrderId: true,
                  fulfillmentStatus: true,
                  merchant: { select: { name: true } },
                },
              },
              shipment: {
                select: {
                  id: true,
                  carrier: true,
                  trackingNumber: true,
                  easypostShipmentId: true,
                  labelUrl: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!queue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Print queue not found.",
        });
      }
      return queue;
    }),

  unfulfilledOrders: protectedProc
    .use(operatorRoles)
    .input(z.object({ warehouseId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
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
      return ctx.db.order.findMany({
        where: {
          accountId,
          warehouseId: input.warehouseId,
          fulfillmentStatus: { not: "FULFILLED" },
          status: "PENDING",
        },
        include: {
          merchant: { select: { id: true, name: true } },
          _count: { select: { shipments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        warehouseId: z.string().cuid(),
        name: z.string().min(1),
        items: z
          .array(
            z.object({
              orderId: z.string().cuid(),
              easypostRateId: z.string().min(1),
              weightOz: z.number().positive(),
              packagingTypeId: z.string().cuid().optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const profile = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
      });
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account profile not found.",
        });
      }
      const warehouse = await ctx.db.warehouse.findFirst({
        where: { id: input.warehouseId, accountId },
      });
      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Warehouse not found.",
        });
      }
      const uniqueOrderIds = new Set(input.items.map((i) => i.orderId));
      if (uniqueOrderIds.size !== input.items.length) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Each order may only appear once in a batch.",
        });
      }
      const orders = await ctx.db.order.findMany({
        where: {
          id: { in: [...uniqueOrderIds] },
          accountId,
        },
      });
      if (orders.length !== uniqueOrderIds.size) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more orders were not found.",
        });
      }
      for (const order of orders) {
        if (order.warehouseId !== input.warehouseId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Order ${order.id} is not assigned to this warehouse.`,
          });
        }
        if (order.fulfillmentStatus === "FULFILLED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Order ${order.channelOrderId} is already fulfilled.`,
          });
        }
      }

      return ctx.db.printQueue.create({
        data: {
          accountId,
          warehouseId: input.warehouseId,
          name: input.name,
          labelCount: input.items.length,
          createdBy: profile.id,
          items: {
            create: input.items.map((row) => ({
              orderId: row.orderId,
              easypostRateId: row.easypostRateId,
              weightOz: row.weightOz,
              packagingTypeId: row.packagingTypeId,
            })),
          },
        },
        include: {
          items: {
            include: {
              order: {
                select: {
                  channelOrderId: true,
                  merchant: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    }),

  purchase: protectedProc
    .use(operatorRoles)
    .input(z.object({ queueId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const queue = await ctx.db.printQueue.findFirst({
        where: { id: input.queueId, accountId },
        include: { items: true },
      });
      if (!queue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Print queue not found.",
        });
      }

      const pendingItems = queue.items.filter((i) => i.status === "PENDING");
      if (!pendingItems.length) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No pending labels to purchase.",
        });
      }

      await ctx.db.printQueue.update({
        where: { id: queue.id },
        data: { status: "PURCHASING" },
      });

      const limit = pLimit(5);
      await Promise.all(
        pendingItems.map((item) =>
          limit(async () => {
            try {
              const [easypostShipmentId, selectedRateId] =
                item.easypostRateId.split("::");
              if (!easypostShipmentId || !selectedRateId) {
                throw new Error(
                  "Invalid EasyPost rate id (expected shp_::rate_).",
                );
              }
              const purchased = await buyShipmentLabel({
                easypostShipmentId,
                rateId: selectedRateId,
              });
              await ctx.db.$transaction(async (tx) => {
                const { shipment } = await recordPurchasedLabel(tx, {
                  accountId,
                  orderId: item.orderId,
                  weightOz: item.weightOz,
                  packagingTypeId: item.packagingTypeId,
                  purchased,
                });
                await tx.printQueueItem.update({
                  where: { id: item.id },
                  data: {
                    status: "PURCHASED",
                    shipmentId: shipment.id,
                    labelUrl: shipment.labelUrl,
                    zplContent: purchased.zplContent,
                  },
                });
              });
            } catch (e) {
              const msg =
                e instanceof Error ? e.message : "EasyPost purchase failed.";
              await ctx.db.printQueueItem.update({
                where: { id: item.id },
                data: {
                  status: "FAILED",
                  errorMessage: msg,
                },
              });
            }
          }),
        ),
      );

      const failed = await ctx.db.printQueueItem.count({
        where: { queueId: queue.id, status: "FAILED" },
      });
      await ctx.db.printQueue.update({
        where: { id: queue.id },
        data: {
          status: failed > 0 ? "PARTIAL_FAILED" : "READY",
        },
      });

      return ctx.db.printQueue.findFirstOrThrow({
        where: { id: queue.id },
        include: {
          items: {
            include: {
              order: { select: { channelOrderId: true } },
              shipment: true,
            },
          },
        },
      });
    }),

  printAll: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        queueId: z.string().cuid(),
        printerId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const queue = await ctx.db.printQueue.findFirst({
        where: { id: input.queueId, accountId },
        include: {
          items: {
            where: { status: "PURCHASED" },
            include: {
              shipment: true,
            },
          },
        },
      });
      if (!queue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Print queue not found.",
        });
      }
      const printer = await ctx.db.thermalPrinter.findFirst({
        where: {
          id: input.printerId,
          accountId,
          warehouseId: queue.warehouseId,
        },
      });
      if (!printer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Printer not found for this warehouse.",
        });
      }
      if (!queue.items.length) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No purchased labels to print.",
        });
      }

      const errors: { itemId: string; message: string }[] = [];
      let printedThisRun = 0;

      for (const item of queue.items) {
        try {
          const payload = await resolveZplPayload({
            item,
            shipment: item.shipment,
          });
          await sendRawToPrinter({
            host: printer.ipAddress,
            port: printer.port,
            payload,
          });
          await ctx.db.printQueueItem.update({
            where: { id: item.id },
            data: { status: "PRINTED" },
          });
          printedThisRun += 1;
        } catch (e) {
          errors.push({
            itemId: item.id,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      if (errors.length === 0) {
        await ctx.db.printQueue.update({
          where: { id: queue.id },
          data: {
            status: "PRINTED",
            printedAt: new Date(),
          },
        });
      }

      return { printed: printedThisRun, errors };
    }),

  reprint: protectedProc
    .use(operatorRoles)
    .input(
      z.object({
        printQueueItemId: z.string().cuid(),
        printerId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const item = await ctx.db.printQueueItem.findFirst({
        where: { id: input.printQueueItemId },
        include: {
          queue: true,
          shipment: true,
        },
      });
      if (!item || item.queue.accountId !== accountId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Queue item not found.",
        });
      }
      if (!item.shipment) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Purchase a label before reprinting this row.",
        });
      }
      if (!["PURCHASED", "PRINTED", "REPRINTED"].includes(item.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Nothing to reprint for this item.",
        });
      }
      const printer = await ctx.db.thermalPrinter.findFirst({
        where: {
          id: input.printerId,
          accountId,
          warehouseId: item.queue.warehouseId,
        },
      });
      if (!printer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Printer not found for this warehouse.",
        });
      }

      const payload = await resolveZplPayload({
        item,
        shipment: item.shipment,
      });
      await sendRawToPrinter({
        host: printer.ipAddress,
        port: printer.port,
        payload,
      });
      return ctx.db.printQueueItem.update({
        where: { id: item.id },
        data: { status: "REPRINTED" },
      });
    }),

  generateManifest: protectedProc
    .use(operatorRoles)
    .input(z.object({ queueId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const queue = await ctx.db.printQueue.findFirst({
        where: { id: input.queueId, accountId },
        include: {
          items: {
            where: {
              status: { in: ["PURCHASED", "PRINTED", "REPRINTED"] },
            },
            include: { shipment: true },
          },
        },
      });
      if (!queue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Print queue not found.",
        });
      }

      const uspsIdsSet = new Set<string>();
      for (const row of queue.items) {
        const carrier = row.shipment?.carrier ?? "";
        const ep = row.shipment?.easypostShipmentId;
        if (ep && carrier.toUpperCase().includes("USPS")) {
          uspsIdsSet.add(ep);
        }
      }
      const uspsIds = [...uspsIdsSet];
      if (!uspsIds.length) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "No USPS shipments with EasyPost IDs found in this queue. SCAN forms apply to USPS only.",
        });
      }

      try {
        const manifest = await createUspsScanForm(uspsIds);
        await ctx.db.printQueue.update({
          where: { id: queue.id },
          data: { manifestFormUrl: manifest.formUrl },
        });
        return manifest;
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "EasyPost could not create SCAN form.";
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: msg,
        });
      }
    }),
});

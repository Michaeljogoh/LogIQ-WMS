import { differenceInCalendarDays } from "date-fns";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { getObjectPresignedUrl, putObject } from "@/lib/s3";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { enqueueIntegrationSyncJob } from "@/server/jobs/integration-sync";
import { dispatchOutboundWebhook } from "@/server/integrations/svix-events";
import {
  buyShipmentLabel,
  createRateShopShipment,
} from "@/server/integrations/easypost";

type RateOption = {
  id: string;
  carrier: string;
  service: string;
  rateCents: number;
  estimatedDays: number;
  isCheapest: boolean;
  isFastest: boolean;
  logiqRecommended: boolean;
};

export const shipmentRouter = createTRPCRouter({
  getById: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ shipmentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const shipment = await ctx.db.shipment.findFirst({
        where: { id: input.shipmentId, accountId },
        include: {
          order: true,
          trackingEvents: { orderBy: { eventAt: "asc" } },
          performanceLog: true,
        },
      });
      if (!shipment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shipment not found.",
        });
      }
      let labelDownloadUrl: string | null = null;
      if (shipment.labelUrl?.startsWith("s3://")) {
        const s3Path = shipment.labelUrl.replace("s3://", "");
        const slashIndex = s3Path.indexOf("/");
        const key = slashIndex >= 0 ? s3Path.slice(slashIndex + 1) : "";
        if (key) {
          labelDownloadUrl = await getObjectPresignedUrl({ key });
        }
      }
      return { ...shipment, labelDownloadUrl };
    }),

  rateShop: protectedProc
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
        orderId: z.string().cuid(),
        weightOz: z.number().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, accountId },
        include: {
          warehouse: {
            select: {
              name: true,
              addressLine1: true,
              city: true,
              state: true,
              zip: true,
              country: true,
            },
          },
        },
      });
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }
      if (!order.warehouse) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Order must be assigned to a warehouse before rate shop.",
        });
      }

      const quote = await createRateShopShipment({
        from: {
          name: order.warehouse.name,
          street1: order.warehouse.addressLine1,
          city: order.warehouse.city,
          state: order.warehouse.state,
          zip: order.warehouse.zip,
          country: order.warehouse.country,
        },
        to: {
          name: order.shippingName,
          street1: order.shippingLine1,
          city: order.shippingCity,
          state: order.shippingState,
          zip: order.shippingZip,
          country: order.shippingCountry,
        },
        weightOz: input.weightOz,
      });

      return quote.rates.map((rate) => ({
        ...rate,
        id: `${quote.easypostShipmentId}::${rate.id}`,
      }));
    }),

  buyLabel: protectedProc
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
        orderId: z.string().cuid(),
        weightOz: z.number().positive(),
        rateId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: input.orderId, accountId },
          select: { id: true },
        });
        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }
        const [easypostShipmentId, selectedRateId] = input.rateId.split("::");
        if (!easypostShipmentId || !selectedRateId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Invalid rate id.",
          });
        }

        const purchased = await buyShipmentLabel({
          easypostShipmentId,
          rateId: selectedRateId,
        });
        if (!purchased.labelUrl) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Carrier did not return a label URL.",
          });
        }

        const labelResponse = await fetch(purchased.labelUrl);
        if (!labelResponse.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to download label from carrier.",
          });
        }
        const labelBuffer = Buffer.from(await labelResponse.arrayBuffer());
        const key = `${accountId}/labels/${Date.now()}-${order.id}.pdf`;
        await putObject({
          key,
          body: labelBuffer,
          contentType: "application/pdf",
        });
        const labelDownloadUrl = await getObjectPresignedUrl({ key });

        const shipment = await tx.shipment.create({
          data: {
            accountId,
            orderId: input.orderId,
            easypostShipmentId: purchased.easypostShipmentId,
            carrier: purchased.carrier,
            service: purchased.service,
            weightOz: input.weightOz,
            labelUrl: `s3://${process.env.AWS_S3_BUCKET ?? "bucket"}/${key}`,
            trackingNumber: purchased.trackingNumber,
            logiqRecommended: false,
            status: "LABEL_CREATED",
          },
        });
        await tx.order.update({
          where: { id: input.orderId },
          data: { fulfillmentStatus: "FULFILLED" },
        });
        const orderContext = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { merchantId: true, channelOrderId: true },
        });
        const merchantIntegrations = await tx.integration.findMany({
          where: {
            accountId,
            merchantId: orderContext?.merchantId,
            status: "CONNECTED",
            type: {
              in: [
                "SHOPIFY",
                "WOOCOMMERCE",
                "BIGCOMMERCE",
                "ETSY",
                "TIKTOK_SHOP",
                "EBAY",
              ],
            },
          },
          select: { id: true },
        });
        await Promise.allSettled(
          merchantIntegrations.map((integration) =>
            enqueueIntegrationSyncJob({
              integrationId: integration.id,
              trigger: "tracking_pushback",
              channelOrderId: orderContext?.channelOrderId,
              trackingNumber: shipment.trackingNumber ?? undefined,
              carrier: shipment.carrier,
              service: shipment.service,
            }),
          ),
        );
        await dispatchOutboundWebhook({
          accountId,
          eventType: "logiqwms.shipment.label_created",
          payload: {
            shipmentId: shipment.id,
            orderId: shipment.orderId,
            trackingNumber: shipment.trackingNumber,
          },
        });
        return { ...shipment, labelDownloadUrl };
      });
    }),

  addTrackingEvent: protectedProc
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
        shipmentId: z.string().cuid(),
        status: z.enum([
          "LABEL_CREATED",
          "IN_TRANSIT",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "EXCEPTION",
          "RETURNED",
          "VOIDED",
        ]),
        description: z.string().trim().max(500).optional(),
        eventAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.$transaction(async (tx) => {
        const shipment = await tx.shipment.findFirst({
          where: { id: input.shipmentId, accountId },
          include: { order: true },
        });
        if (!shipment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shipment not found.",
          });
        }
        const eventAt = input.eventAt ?? new Date();
        await tx.trackingEvent.create({
          data: {
            accountId,
            shipmentId: shipment.id,
            status: input.status,
            description: input.description ?? null,
            eventAt,
          },
        });

        const shipmentUpdate: {
          status:
            | "LABEL_CREATED"
            | "IN_TRANSIT"
            | "OUT_FOR_DELIVERY"
            | "DELIVERED"
            | "EXCEPTION"
            | "RETURNED"
            | "VOIDED";
          shippedAt?: Date;
          deliveredAt?: Date;
        } = { status: input.status };
        if (input.status === "IN_TRANSIT" && !shipment.shippedAt) {
          shipmentUpdate.shippedAt = eventAt;
        }
        if (input.status === "DELIVERED") {
          shipmentUpdate.deliveredAt = eventAt;
        }
        const updatedShipment = await tx.shipment.update({
          where: { id: shipment.id },
          data: shipmentUpdate,
        });

        if (input.status === "DELIVERED") {
          const actualDays = shipment.shippedAt
            ? Math.max(1, differenceInCalendarDays(eventAt, shipment.shippedAt))
            : null;
          await tx.carrierPerformanceLog.upsert({
            where: { shipmentId: shipment.id },
            update: {
              actualDays: actualDays ?? undefined,
              onTime:
                actualDays !== null && shipment.order.slaHours
                  ? actualDays * 24 <= shipment.order.slaHours
                  : null,
            },
            create: {
              accountId,
              shipmentId: shipment.id,
              carrier: shipment.carrier,
              service: shipment.service,
              weightOz: shipment.weightOz ?? 0,
              promisedDays:
                typeof shipment.order.slaHours === "number"
                  ? Math.ceil(shipment.order.slaHours / 24)
                  : null,
              actualDays: actualDays ?? null,
              onTime:
                actualDays !== null && shipment.order.slaHours
                  ? actualDays * 24 <= shipment.order.slaHours
                  : null,
              rateCents: shipment.rateCents ?? 0,
            },
          });
        }
        return updatedShipment;
      });
    }),
});

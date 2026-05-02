import type { Prisma } from "@/generated/prisma/client";
import { getObjectPresignedUrl, putObject } from "@/lib/s3";
import { dispatchOutboundWebhook } from "@/server/integrations/svix-events";
import { enqueueIntegrationSyncJob } from "@/server/jobs/integration-sync";
import {
  dimWeightOzFromBox,
  divisorForCarrierLabel,
} from "@/server/packaging/dim-weight";

export type PurchasedEasyPostLabel = {
  easypostShipmentId: string;
  trackingNumber: string | null;
  carrier: string;
  service: string;
  labelUrl: string | null;
  rateCents: number;
  zplContent: string | null;
};

export async function recordPurchasedLabel(
  tx: Prisma.TransactionClient,
  params: {
    accountId: string;
    orderId: string;
    weightOz: number;
    packagingTypeId?: string | null;
    purchased: PurchasedEasyPostLabel;
  },
) {
  const { accountId, orderId, weightOz, packagingTypeId: packagingInput } =
    params;
  const purchased = params.purchased;

  let packagingTypeId: string | null = packagingInput ?? null;
  let packagingCostCents: number | null = null;
  let dimWeightOz: number | null = null;
  if (packagingTypeId) {
    const pt = await tx.packagingType.findFirst({
      where: { id: packagingTypeId, accountId },
    });
    if (pt) {
      packagingCostCents = pt.costCents;
      const divisor = divisorForCarrierLabel(purchased.carrier);
      dimWeightOz = dimWeightOzFromBox({
        lengthIn: pt.lengthIn,
        widthIn: pt.widthIn,
        heightIn: pt.heightIn,
        divisor,
      });
    } else {
      packagingTypeId = null;
    }
  }

  if (!purchased.labelUrl) {
    throw new Error("Carrier did not return a label URL.");
  }

  const labelResponse = await fetch(purchased.labelUrl);
  if (!labelResponse.ok) {
    throw new Error("Failed to download label from carrier.");
  }
  const labelBuffer = Buffer.from(await labelResponse.arrayBuffer());
  const key = `${accountId}/labels/${Date.now()}-${orderId}.pdf`;
  await putObject({
    key,
    body: labelBuffer,
    contentType: "application/pdf",
  });
  const labelDownloadUrl = await getObjectPresignedUrl({ key });

  const shipment = await tx.shipment.create({
    data: {
      accountId,
      orderId,
      easypostShipmentId: purchased.easypostShipmentId,
      carrier: purchased.carrier,
      service: purchased.service,
      weightOz,
      rateCents: purchased.rateCents,
      labelUrl: `s3://${process.env.AWS_S3_BUCKET ?? "bucket"}/${key}`,
      trackingNumber: purchased.trackingNumber,
      logiqRecommended: false,
      status: "LABEL_CREATED",
      packagingTypeId,
      packagingCostCents,
      dimWeightOz,
    },
  });

  await tx.order.update({
    where: { id: orderId },
    data: { fulfillmentStatus: "FULFILLED" },
  });

  const orderContext = await tx.order.findUnique({
    where: { id: orderId },
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

  return { shipment, labelDownloadUrl };
}

import { db } from "@/lib/db";
import type { IntegrationSyncJobPayload } from "@/server/jobs/queues";
import {
  pushTrackingToIntegration,
  syncIntegrationOrders,
} from "@/server/integrations/hub";

export async function processIntegrationSyncJob(
  payload: IntegrationSyncJobPayload,
): Promise<void> {
  const integration = await db.integration.findUnique({
    where: { id: payload.integrationId },
  });
  if (!integration) {
    return;
  }

  if (
    payload.trigger === "tracking_pushback" &&
    payload.channelOrderId &&
    payload.trackingNumber &&
    payload.carrier
  ) {
    await pushTrackingToIntegration({
      integration,
      channelOrderId: payload.channelOrderId,
      trackingNumber: payload.trackingNumber,
      carrier: payload.carrier,
      service: payload.service,
    });
    await db.integrationSyncLog.create({
      data: {
        accountId: integration.accountId,
        integrationId: integration.id,
        eventType: "tracking_pushback",
        status: "SUCCESS",
      },
    });
    return;
  }

  await syncIntegrationOrders({
    integration,
    trigger:
      payload.trigger === "webhook" || payload.trigger === "manual"
        ? payload.trigger
        : "poll",
  });
}

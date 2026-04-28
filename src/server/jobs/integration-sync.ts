import { db } from "@/lib/db";
import { processIntegrationSyncJob } from "@/server/jobs/workers/integration-sync.worker";
import type { IntegrationSyncJobPayload } from "./queues";

export async function enqueueIntegrationSyncJob(
  payload: IntegrationSyncJobPayload,
): Promise<void> {
  // Current deployment runs jobs in-process; BullMQ queue wiring can call this later.
  await processIntegrationSyncJob(payload);
}

export async function runScheduledIntegrationPolls(): Promise<void> {
  const integrations = await db.integration.findMany({
    where: {
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
  for (const integration of integrations) {
    await enqueueIntegrationSyncJob({
      integrationId: integration.id,
      trigger: "poll",
    });
  }
}

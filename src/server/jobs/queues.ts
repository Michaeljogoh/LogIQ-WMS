/**
 * BullMQ queue definitions.
 */
export const QUEUE_NAMES = {
  notify: "notify",
  integrationSync: "integration-sync",
  logiq: "logiq",
} as const;

export type IntegrationSyncJobPayload = {
  integrationId: string;
  trigger: "poll" | "webhook" | "manual" | "tracking_pushback";
  channelOrderId?: string;
  trackingNumber?: string;
  carrier?: string;
  service?: string | null;
};

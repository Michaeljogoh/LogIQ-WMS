/**
 * BullMQ queue definitions — implement when workers are deployed (Railway).
 */
export const QUEUE_NAMES = {
  notify: "notify",
  integrationSync: "integration-sync",
  logiq: "logiq",
} as const;

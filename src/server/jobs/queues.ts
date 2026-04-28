/**
 * BullMQ queue definitions.
 */
import { processNotifyJob } from "./workers/notify.worker";

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

export type NotifyJobPayload =
  | {
      name: "notify.dispatch";
      payload: {
        accountId: string;
        type:
          | "LOW_STOCK"
          | "DEAD_STOCK"
          | "STOCKOUT_RISK"
          | "SLA_BREACH"
          | "ORDER_EXCEPTION"
          | "SHIPMENT_DELIVERED"
          | "INVOICE_GENERATED"
          | "INVOICE_OVERDUE"
          | "CYCLE_COUNT_DUE"
          | "PO_OVERDUE"
          | "CARRIER_EXCEPTION"
          | "CAPACITY_WARNING";
        severity: "INFO" | "WARNING" | "CRITICAL";
        title: string;
        body: string;
        data?: Record<string, unknown>;
        targetUserIds?: string[] | null;
        merchantId?: string | null;
      };
    }
  | {
      name: "notify.sendEmail" | "notify.sendSms" | "notify.sendPush";
      payload: {
        notificationId: string;
        accountId: string;
        userId: string;
      };
    }
  | {
      name: "notify.escalate";
      payload: {
        accountId?: string;
      };
    };

export const notifyQueue = {
  async add<TName extends NotifyJobPayload["name"]>(
    name: TName,
    payload: Extract<NotifyJobPayload, { name: TName }>["payload"],
  ) {
    await processNotifyJob({ name, payload } as Extract<
      NotifyJobPayload,
      { name: TName }
    >);
  },
};

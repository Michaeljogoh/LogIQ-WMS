import { notifyQueue } from "@/server/jobs/queues";

export async function dispatchDomainNotification(args: {
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
}) {
  await notifyQueue.add("notify.dispatch", {
    accountId: args.accountId,
    type: args.type,
    severity: args.severity,
    title: args.title,
    body: args.body,
    data: args.data,
    targetUserIds: args.targetUserIds ?? null,
    merchantId: args.merchantId ?? null,
  });
}

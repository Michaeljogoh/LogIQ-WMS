import { cn } from "@/lib/utils";

type StatusVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "primary";

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
  // Fulfillment
  FULFILLED: { label: "Fulfilled", variant: "success" },
  UNFULFILLED: { label: "Unfulfilled", variant: "neutral" },
  PARTIALLY_FULFILLED: { label: "Partial", variant: "info" },

  // Order status
  PENDING: { label: "Pending", variant: "primary" },
  ON_HOLD: { label: "On hold", variant: "warning" },
  CANCELLED: { label: "Cancelled", variant: "danger" },

  // Shipments
  LABEL_CREATED: { label: "Label created", variant: "neutral" },
  IN_TRANSIT: { label: "In transit", variant: "info" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", variant: "primary" },
  DELIVERED: { label: "Delivered", variant: "success" },
  EXCEPTION: { label: "Exception", variant: "danger" },
  RETURNED: { label: "Returned", variant: "warning" },
  VOIDED: { label: "Voided", variant: "neutral" },

  // PO status
  DRAFT: { label: "Draft", variant: "neutral" },
  SENT: { label: "Sent", variant: "primary" },
  CONFIRMED: { label: "Confirmed", variant: "info" },
  IN_TRANSIT_PO: { label: "In transit", variant: "info" },
  PARTIALLY_RECEIVED: { label: "Partial", variant: "warning" },
  RECEIVED: { label: "Received", variant: "success" },

  // Invoice
  PENDING_REVIEW: { label: "Pending review", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  DISPUTED: { label: "Disputed", variant: "danger" },

  // Integrations
  CONNECTED: { label: "Connected", variant: "success" },
  ERROR: { label: "Error", variant: "danger" },
  DISCONNECTED: { label: "Disconnected", variant: "neutral" },
  PENDING_AUTH: { label: "Pending auth", variant: "warning" },

  // Pick lists
  IN_PROGRESS: { label: "In progress", variant: "primary" },
  COMPLETED: { label: "Completed", variant: "success" },

  // Transfers / counts
  RECONCILED: { label: "Reconciled", variant: "success" },
  ACTIVE: { label: "Active", variant: "primary" },
  SHIPPED: { label: "Shipped", variant: "info" },

  // Generic
  TRUE: { label: "Yes", variant: "success" },
  FALSE: { label: "No", variant: "neutral" },
};

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success:
    "bg-success/10 text-success border-success/20 dark:bg-success/15 dark:text-success dark:border-success/25",
  warning:
    "bg-warning/10 text-warning border-warning/20 dark:bg-warning/15 dark:text-warning dark:border-warning/25",
  danger:
    "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/15 dark:text-destructive dark:border-destructive/25",
  info: "bg-info/10 text-info border-info/20 dark:bg-info/15 dark:text-info dark:border-info/25",
  primary:
    "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/25",
  neutral:
    "bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground",
};

export function StatusBadge({
  status,
  label: overrideLabel,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const mapping = STATUS_MAP[status.toUpperCase()];
  const label = overrideLabel ?? mapping?.label ?? status;
  const variant: StatusVariant = mapping?.variant ?? "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

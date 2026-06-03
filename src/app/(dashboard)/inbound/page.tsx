"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarClockIcon,
  ClipboardListIcon,
  InboxIcon,
  TruckIcon,
} from "lucide-react";
import { useTRPC } from "@/app/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: "success" | "warning" | "danger" | "info" | "default";
}) {
  const iconColor = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
    default: "text-primary",
  }[accent ?? "default"];

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted",
          iconColor,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-2xl font-semibold tracking-tight",
            value > 0 && accent && accent !== "default"
              ? iconColor
              : "text-foreground",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  const trpc = useTRPC();
  const poQuery = useQuery(trpc.purchaseOrder.list.queryOptions({}));
  const workOrderQuery = useQuery(
    trpc.workOrder.list.queryOptions({ status: "PENDING" }),
  );

  const pos = poQuery.data ?? [];
  const openPoCount = pos.filter(
    (row) => row.status !== "RECEIVED" && row.status !== "CANCELLED",
  ).length;
  const expectedThisWeekCount = pos.filter((row) => {
    if (!row.expectedDate) return false;
    const now = new Date();
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(now.getDate() + 7);
    const expected = new Date(row.expectedDate);
    return expected >= now && expected <= sevenDaysOut;
  }).length;
  const pendingWorkOrders = workOrderQuery.data?.length ?? 0;
  const inTransitPoCount = pos.filter(
    (row) => row.status === "IN_TRANSIT",
  ).length;
  const partiallyReceivedPoCount = pos.filter(
    (row) => row.status === "PARTIALLY_RECEIVED",
  ).length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Inbound"
        description="Track purchase orders, incoming shipments, and work orders."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={ClipboardListIcon}
          label="Open purchase orders"
          value={openPoCount}
          accent="default"
        />
        <KpiCard
          icon={CalendarClockIcon}
          label="Expected this week"
          value={expectedThisWeekCount}
          accent="info"
        />
        <KpiCard
          icon={ClipboardListIcon}
          label="Work orders pending"
          value={pendingWorkOrders}
          accent={pendingWorkOrders > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={TruckIcon}
          label="In transit"
          value={inTransitPoCount}
          accent="info"
        />
        <KpiCard
          icon={InboxIcon}
          label="Partially received"
          value={partiallyReceivedPoCount}
          accent={partiallyReceivedPoCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Purchase orders</h2>
          <p className="text-xs text-muted-foreground">
            All active inbound shipments
          </p>
        </div>

        {poQuery.isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={5} />
          </div>
        ) : pos.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={InboxIcon}
              title="No purchase orders"
              description="Create a purchase order to track inventory coming into your warehouse."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 font-semibold text-foreground">
                  PO number
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Merchant
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Expected
                </TableHead>
                <TableHead className="pr-5 text-right font-semibold text-foreground">
                  Lines
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => (
                <TableRow key={po.id} className="transition-colors">
                  <TableCell className="pl-5 font-medium text-foreground">
                    {po.poNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {po.merchant.name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={po.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {po.expectedDate
                      ? new Date(po.expectedDate).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="pr-5 text-right text-sm text-muted-foreground">
                    {po._count.lines}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

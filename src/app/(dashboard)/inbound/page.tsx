"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarClockIcon,
  ClipboardListIcon,
  InboxIcon,
  TruckIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <SettingsPage>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/inbound/purchase-orders/new">New purchase order</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/inbound/work-orders/new">New work order</Link>
            </Button>
          </div>
        }
        description="Track purchase orders, incoming shipments, and work orders."
        title="Inbound"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiStatCard
          accent="navy-blue"
          icon={ClipboardListIcon}
          isLoading={poQuery.isLoading}
          label="Open purchase orders"
          value={openPoCount}
        />
        <KpiStatCard
          accent="navy-teal"
          icon={CalendarClockIcon}
          isLoading={poQuery.isLoading}
          label="Expected this week"
          value={expectedThisWeekCount}
        />
        <KpiStatCard
          accent={pendingWorkOrders > 0 ? "warning" : "navy-violet"}
          icon={ClipboardListIcon}
          isLoading={workOrderQuery.isLoading}
          label="Work orders pending"
          value={pendingWorkOrders}
        />
        <KpiStatCard
          accent="navy"
          icon={TruckIcon}
          isLoading={poQuery.isLoading}
          label="In transit"
          value={inTransitPoCount}
        />
        <KpiStatCard
          accent={partiallyReceivedPoCount > 0 ? "warning" : "success"}
          icon={InboxIcon}
          isLoading={poQuery.isLoading}
          label="Partially received"
          value={partiallyReceivedPoCount}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          actions={
            <Button asChild size="sm" variant="outline">
              <Link href="/inbound/purchase-orders">View all</Link>
            </Button>
          }
          description="All active inbound shipments"
          icon={InboxIcon}
          title="Purchase orders"
        />
        <SettingsPanelBody className="p-0">
          {poQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton columns={5} rows={6} />
            </div>
          ) : pos.length === 0 ? (
            <div className="p-8">
              <EmptyState
                action={
                  <Button asChild>
                    <Link href="/inbound/purchase-orders/new">
                      Create purchase order
                    </Link>
                  </Button>
                }
                description="Create a purchase order to track inventory coming into your warehouse."
                icon={InboxIcon}
                title="No purchase orders"
              />
            </div>
          ) : (
            <SettingsTableWrap className="border-0 rounded-none">
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
                    <TableRow className="transition-colors" key={po.id}>
                      <TableCell className="pl-5 font-medium">
                        <Link
                          className="text-primary hover:underline"
                          href={`/inbound/purchase-orders/${po.id}/receive`}
                        >
                          {po.poNumber}
                        </Link>
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
            </SettingsTableWrap>
          )}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CheckSquareIcon,
  Clock,
  PackageIcon,
  PauseCircleIcon,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import {
  paginateRows,
  TablePagination,
} from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Tab = "UNFULFILLED" | "DUE_TODAY" | "ALL";

const PAGE_SIZE = 10;

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("UNFULFILLED");
  const [page, setPage] = useState(0);
  const ordersQuery = useQuery(trpc.order.list.queryOptions({ tab }));
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setPage(0);
    setSelected([]);
  }, [tab]);

  const bulkStatus = useMutation(
    trpc.order.bulkSetStatus.mutationOptions({
      onSuccess: async () => {
        setSelected([]);
        await queryClient.invalidateQueries(
          trpc.order.list.queryFilter({ tab }),
        );
      },
    }),
  );

  const orders = ordersQuery.data ?? [];
  const pageOrders = paginateRows(orders, page, PAGE_SIZE);
  const allSelected =
    pageOrders.length > 0 &&
    pageOrders.every((order) => selected.includes(order.id));

  const stats = useMemo(() => {
    const unfulfilled = orders.filter(
      (o) => o.fulfillmentStatus !== "FULFILLED",
    ).length;
    const onHold = orders.filter((o) => o.status === "ON_HOLD").length;
    const overdue = orders.filter(
      (o) =>
        o.dueAt &&
        new Date(o.dueAt) < new Date() &&
        o.fulfillmentStatus !== "FULFILLED",
    ).length;
    return { total: orders.length, unfulfilled, onHold, overdue };
  }, [orders]);

  function toggleAll() {
    if (allSelected) {
      const pageIds = new Set(pageOrders.map((order) => order.id));
      setSelected((prev) => prev.filter((id) => !pageIds.has(id)));
      return;
    }
    setSelected((prev) => [
      ...new Set([...prev, ...pageOrders.map((order) => order.id)]),
    ]);
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  }

  return (
    <SettingsPage>
      <PageHeader
        actions={
          selected.length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-1.5 shadow-sm">
              <span className="text-xs text-muted-foreground">
                {selected.length} selected
              </span>
              <Button
                disabled={bulkStatus.isPending}
                onClick={() =>
                  bulkStatus.mutate({ orderIds: selected, status: "ON_HOLD" })
                }
                size="sm"
                variant="outline"
              >
                <PauseCircleIcon className="mr-1 size-3.5" aria-hidden />
                Hold
              </Button>
              <Button
                disabled={bulkStatus.isPending}
                onClick={() =>
                  bulkStatus.mutate({ orderIds: selected, status: "PENDING" })
                }
                size="sm"
              >
                <CheckSquareIcon className="mr-1 size-3.5" aria-hidden />
                Unhold
              </Button>
            </div>
          ) : null
        }
        description="Manage fulfillment across all merchants and channels."
        title="Orders"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="In current view"
          icon={ShoppingCart}
          isLoading={ordersQuery.isLoading}
          label="Orders"
          value={stats.total}
        />
        <KpiStatCard
          accent="warning"
          hint="Awaiting fulfillment"
          icon={PackageIcon}
          isLoading={ordersQuery.isLoading}
          label="Unfulfilled"
          value={stats.unfulfilled}
        />
        <KpiStatCard
          accent="navy-violet"
          hint="Paused for review"
          icon={PauseCircleIcon}
          isLoading={ordersQuery.isLoading}
          label="On hold"
          value={stats.onHold}
        />
        <KpiStatCard
          accent={stats.overdue > 0 ? "warning" : "success"}
          hint="Past due date"
          icon={Clock}
          isLoading={ordersQuery.isLoading}
          label="Overdue"
          value={stats.overdue}
        />
      </div>

      <SettingsPanel>
        <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            className="orders-filter-tabs dashboard-tabs"
            onValueChange={(v) => setTab(v as Tab)}
            value={tab}
          >
            <TabsList className="h-9 rounded-full p-1">
              <TabsTrigger
                className="h-7 rounded-full px-4 text-xs font-semibold data-[state=active]:!text-white data-[state=active]:shadow-none"
                value="UNFULFILLED"
              >
                Unfulfilled
              </TabsTrigger>
              <TabsTrigger
                className="h-7 rounded-full px-4 text-xs font-semibold data-[state=active]:!text-white data-[state=active]:shadow-none"
                value="DUE_TODAY"
              >
                Due today
              </TabsTrigger>
              <TabsTrigger
                className="h-7 rounded-full px-4 text-xs font-semibold data-[state=active]:!text-white data-[state=active]:shadow-none"
                value="ALL"
              >
                All orders
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <SettingsPanelBody className="p-0">
          {ordersQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton columns={7} rows={7} />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                description="Orders will appear here once merchants push them to LogIQ."
                icon={PackageIcon}
                title="No orders here"
              />
            </div>
          ) : (
            <>
              <SettingsTableWrap className="border-0 rounded-none">
                <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pl-5">
                      <Checkbox
                        aria-label="Select all"
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Order
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Merchant
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Fulfillment
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Due
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageOrders.map((order) => {
                    const isSelected = selected.includes(order.id);
                    const overdue =
                      order.dueAt &&
                      new Date(order.dueAt) < new Date() &&
                      order.fulfillmentStatus !== "FULFILLED";
                    return (
                      <TableRow
                        className={cn(
                          "logiq-table-row transition-colors",
                          isSelected && "bg-primary/5",
                        )}
                        key={order.id}
                      >
                        <TableCell className="pl-5">
                          <Checkbox
                            aria-label={`Select ${order.channelOrderId}`}
                            checked={isSelected}
                            onCheckedChange={(c) =>
                              toggle(order.id, Boolean(c))
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {order.channelOrderId}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.merchant.name}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.fulfillmentStatus} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-sm",
                            overdue
                              ? "font-medium text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {order.dueAt
                            ? new Date(order.dueAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="pr-4">
                          <Link
                            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            href={`/orders/${order.id}`}
                          >
                            <ArrowRightIcon className="size-3.5" aria-hidden />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </SettingsTableWrap>
              <TablePagination
                label="Orders"
                onPageChange={setPage}
                page={page}
                pageSize={PAGE_SIZE}
                total={orders.length}
              />
            </>
          )}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

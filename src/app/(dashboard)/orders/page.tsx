"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CheckSquareIcon,
  PackageIcon,
  PauseCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
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

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("UNFULFILLED");
  const ordersQuery = useQuery(trpc.order.list.queryOptions({ tab }));
  const [selected, setSelected] = useState<string[]>([]);

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
  const allSelected = orders.length > 0 && selected.length === orders.length;

  function toggleAll() {
    setSelected(allSelected ? [] : orders.map((o) => o.id));
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Orders"
        description="Manage fulfillment across all merchants and channels."
        actions={
          selected.length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 shadow-sm">
              <span className="text-xs text-muted-foreground">
                {selected.length} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkStatus.isPending}
                onClick={() =>
                  bulkStatus.mutate({ orderIds: selected, status: "ON_HOLD" })
                }
              >
                <PauseCircleIcon className="mr-1 size-3.5" />
                Hold
              </Button>
              <Button
                size="sm"
                disabled={bulkStatus.isPending}
                onClick={() =>
                  bulkStatus.mutate({ orderIds: selected, status: "PENDING" })
                }
              >
                <CheckSquareIcon className="mr-1 size-3.5" />
                Unhold
              </Button>
            </div>
          ) : null
        }
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="h-8 rounded-lg bg-muted/60 p-0.5">
              <TabsTrigger
                value="UNFULFILLED"
                className="h-7 rounded-md px-3 text-xs"
              >
                Unfulfilled
              </TabsTrigger>
              <TabsTrigger
                value="DUE_TODAY"
                className="h-7 rounded-md px-3 text-xs"
              >
                Due today
              </TabsTrigger>
              <TabsTrigger value="ALL" className="h-7 rounded-md px-3 text-xs">
                All orders
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {ordersQuery.isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={7} columns={7} />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={PackageIcon}
              title="No orders here"
              description="Orders will appear here once merchants push them to LogIQ."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pl-5">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
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
              {orders.map((order) => {
                const isSelected = selected.includes(order.id);
                const overdue =
                  order.dueAt &&
                  new Date(order.dueAt) < new Date() &&
                  order.fulfillmentStatus !== "FULFILLED";
                return (
                  <TableRow
                    key={order.id}
                    className={cn(
                      "transition-colors",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <TableCell className="pl-5">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => toggle(order.id, Boolean(c))}
                        aria-label={`Select ${order.channelOrderId}`}
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
                        ? new Date(order.dueAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ArrowRightIcon className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Inbox, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsFilterBar,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("ALL");
  const poQuery = useQuery(
    trpc.purchaseOrder.list.queryOptions({
      status:
        status === "ALL"
          ? undefined
          : (status as
              | "DRAFT"
              | "SENT"
              | "CONFIRMED"
              | "IN_TRANSIT"
              | "PARTIALLY_RECEIVED"
              | "RECEIVED"
              | "CANCELLED"),
    }),
  );
  const pos = poQuery.data ?? [];

  const stats = useMemo(() => {
    const open = pos.filter(
      (po) => po.status !== "RECEIVED" && po.status !== "CANCELLED",
    ).length;
    const inTransit = pos.filter((po) => po.status === "IN_TRANSIT").length;
    const received = pos.filter((po) => po.status === "RECEIVED").length;
    return { total: pos.length, open, inTransit, received };
  }, [pos]);

  const updateStatus = useMutation(
    trpc.purchaseOrder.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.purchaseOrder.list.queryFilter(),
        );
      },
    }),
  );

  const nextStatusByCurrent: Record<
    | "DRAFT"
    | "SENT"
    | "CONFIRMED"
    | "IN_TRANSIT"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "CANCELLED",
    "SENT" | "CONFIRMED" | "IN_TRANSIT" | "CANCELLED" | null
  > = {
    DRAFT: "SENT",
    SENT: "CONFIRMED",
    CONFIRMED: "IN_TRANSIT",
    IN_TRANSIT: null,
    PARTIALLY_RECEIVED: null,
    RECEIVED: null,
    CANCELLED: null,
  };

  return (
    <SettingsPage>
      <PageHeader
        actions={
          <Button asChild>
            <Link href="/inbound/purchase-orders/new">
              <Plus className="size-4" aria-hidden />
              New purchase order
            </Link>
          </Button>
        }
        description="Manage inbound purchase orders, track status, and receive inventory."
        title="Purchase orders"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="Matching current filter"
          icon={ClipboardList}
          isLoading={poQuery.isLoading}
          label="Purchase orders"
          value={stats.total}
        />
        <KpiStatCard
          accent="warning"
          hint="Awaiting receipt"
          icon={Inbox}
          isLoading={poQuery.isLoading}
          label="Open"
          value={stats.open}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Shipments on the way"
          icon={Truck}
          isLoading={poQuery.isLoading}
          label="In transit"
          value={stats.inTransit}
        />
        <KpiStatCard
          accent="success"
          hint="Fully received"
          icon={Inbox}
          isLoading={poQuery.isLoading}
          label="Received"
          value={stats.received}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Advance status or open receive workflow for each PO."
          icon={ClipboardList}
          title="All purchase orders"
        />
        <SettingsPanelBody>
          <SettingsFilterBar>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-56 space-y-2">
                <Label>Status filter</Label>
                <Select onValueChange={setStatus} value={status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="IN_TRANSIT">In transit</SelectItem>
                    <SelectItem value="PARTIALLY_RECEIVED">
                      Partially received
                    </SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingsFilterBar>
          <SettingsTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Receive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {po.supplier.name}
                    </TableCell>
                    <TableCell>{po.merchant.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={po.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {po.expectedDate
                        ? new Date(po.expectedDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {nextStatusByCurrent[po.status] ? (
                        <Button
                          className="h-8 px-2"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              poId: po.id,
                              status: nextStatusByCurrent[po.status]!,
                            })
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Mark {nextStatusByCurrent[po.status]}
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/inbound/purchase-orders/${po.id}/receive`}
                        >
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!poQuery.isLoading && pos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={7}
                    >
                      No purchase orders match this filter.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </SettingsTableWrap>
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

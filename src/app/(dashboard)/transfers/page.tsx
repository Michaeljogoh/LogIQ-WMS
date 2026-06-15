"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, CheckCircle, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TransfersPage() {
  const trpc = useTRPC();
  const listQuery = useQuery(trpc.transfer.list.queryOptions());
  const transfers = listQuery.data ?? [];

  const stats = useMemo(() => {
    const inTransit = transfers.filter(
      (t) => t.status === "SHIPPED" || t.status === "PARTIALLY_RECEIVED",
    ).length;
    const received = transfers.filter((t) => t.status === "RECEIVED").length;
    const lines = transfers.reduce((sum, t) => sum + t.lines.length, 0);
    return { total: transfers.length, inTransit, received, lines };
  }, [transfers]);

  return (
    <SettingsPage>
      <PageHeader
        actions={
          <Button asChild>
            <Link href="/transfers/new">
              <Plus className="size-4" aria-hidden />
              New transfer
            </Link>
          </Button>
        }
        description="Move inventory between warehouses with ship and receive tracking."
        title="Inter-warehouse transfers"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="All transfer orders"
          icon={ArrowRightLeft}
          isLoading={listQuery.isLoading}
          label="Transfers"
          value={stats.total}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Shipped or partially received"
          icon={Truck}
          isLoading={listQuery.isLoading}
          label="In transit"
          value={stats.inTransit}
        />
        <KpiStatCard
          accent="success"
          hint="Fully received"
          icon={CheckCircle}
          isLoading={listQuery.isLoading}
          label="Received"
          value={stats.received}
        />
        <KpiStatCard
          accent="navy-violet"
          hint="SKUs being moved"
          icon={ArrowRightLeft}
          isLoading={listQuery.isLoading}
          label="Line items"
          value={stats.lines}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Most recent first. Open a transfer to ship or receive inventory."
          icon={Truck}
          title="All transfers"
        />
        <SettingsPanelBody>
          <SettingsTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {t.toNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.fromWarehouse.code} → {t.toWarehouse.code}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {t.lines.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/transfers/${t.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!listQuery.isLoading && transfers.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-sm" colSpan={5}>
                      No transfers yet.
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

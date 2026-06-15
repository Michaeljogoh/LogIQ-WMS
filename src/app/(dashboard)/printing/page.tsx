"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Plus, Printer, PrinterIcon, AlertTriangle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusBadge(status: string) {
  if (status === "READY" || status === "PRINTED") {
    return <Badge variant="success">{status}</Badge>;
  }
  if (status === "PARTIAL_FAILED") {
    return <Badge variant="destructive">{status}</Badge>;
  }
  if (status === "PURCHASING") {
    return <Badge variant="info">{status}</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

export default function PrintingQueuesPage() {
  const trpc = useTRPC();
  const listQuery = useQuery(trpc.printQueue.list.queryOptions());
  const queues = listQuery.data ?? [];

  const stats = useMemo(() => {
    const ready = queues.filter(
      (q) => q.status === "READY" || q.status === "PRINTED",
    ).length;
    const failed = queues.filter((q) => q.status === "PARTIAL_FAILED").length;
    const labels = queues.reduce((sum, q) => sum + q.labelCount, 0);
    return { total: queues.length, ready, failed, labels };
  }, [queues]);

  return (
    <SettingsPage>
      <PageHeader
        actions={
          <Button asChild>
            <Link href="/printing/new">
              <Plus className="size-4" aria-hidden />
              New print queue
            </Link>
          </Button>
        }
        description="Purchase carrier labels in bulk and send ZPL to thermal printers."
        title="Batch label printing"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="Label batch jobs"
          icon={Printer}
          isLoading={listQuery.isLoading}
          label="Print queues"
          value={stats.total}
        />
        <KpiStatCard
          accent="success"
          hint="Ready or completed"
          icon={CheckCircle}
          isLoading={listQuery.isLoading}
          label="Ready / printed"
          value={stats.ready}
        />
        <KpiStatCard
          accent={stats.failed > 0 ? "warning" : "navy-teal"}
          hint="Needs attention"
          icon={AlertTriangle}
          isLoading={listQuery.isLoading}
          label="Partial failed"
          value={stats.failed}
        />
        <KpiStatCard
          accent="navy-violet"
          hint="Across all queues"
          icon={PrinterIcon}
          isLoading={listQuery.isLoading}
          label="Total labels"
          value={stats.labels}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Most recent first. Open a queue to purchase labels, print, or download a USPS SCAN form."
          icon={Printer}
          title="Queues"
        />
        <SettingsPanelBody>
          <SettingsTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.warehouse.code} — {row.warehouse.name}
                    </TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.labelCount}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/printing/${row.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!listQuery.isLoading && queues.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-sm" colSpan={6}>
                      No print queues yet.
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

"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ListChecks, PlayCircle } from "lucide-react";
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
  const cycleCountsQuery = useQuery(trpc.cycleCount.list.queryOptions({}));
  const counts = cycleCountsQuery.data ?? [];

  const stats = useMemo(() => {
    const active = counts.filter((row) => row.status === "ACTIVE").length;
    const completed = counts.filter((row) => row.status === "COMPLETED").length;
    const lines = counts.reduce((sum, row) => sum + row._count.lines, 0);
    return { total: counts.length, active, completed, lines };
  }, [counts]);

  return (
    <SettingsPage>
      <PageHeader
        description="Track count progress and reconcile discrepancies by warehouse."
        title="Cycle counts"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="All count sessions"
          icon={ClipboardList}
          isLoading={cycleCountsQuery.isLoading}
          label="Total counts"
          value={stats.total}
        />
        <KpiStatCard
          accent="warning"
          hint="In progress right now"
          icon={PlayCircle}
          isLoading={cycleCountsQuery.isLoading}
          label="Active"
          value={stats.active}
        />
        <KpiStatCard
          accent="success"
          hint="Reconciled and closed"
          icon={ListChecks}
          isLoading={cycleCountsQuery.isLoading}
          label="Completed"
          value={stats.completed}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Lines across all counts"
          icon={ClipboardList}
          isLoading={cycleCountsQuery.isLoading}
          label="Count lines"
          value={stats.lines}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Open a count to enter quantities and reconcile variances."
          icon={ClipboardList}
          title="All cycle counts"
        />
        <SettingsPanelBody>
          <SettingsTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="text-primary hover:underline"
                        href={`/inventory/cycle-counts/${row.id}`}
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.warehouseId}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row._count.lines}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "ACTIVE"
                            ? "info"
                            : row.status === "COMPLETED"
                              ? "success"
                              : "secondary"
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {cycleCountsQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={4}
                    >
                      Loading cycle counts…
                    </TableCell>
                  </TableRow>
                ) : null}
                {!cycleCountsQuery.isLoading && counts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={4}
                    >
                      No cycle counts yet.
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

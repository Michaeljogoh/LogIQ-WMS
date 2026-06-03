"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  ClipboardListIcon,
  InboxIcon,
  MapPinIcon,
  PackageSearchIcon,
  PrinterIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { ChartCard } from "@/components/charts/chart-card";
import { DashboardLineChart } from "@/components/charts/dashboard-line-chart";
import { DashboardPieChart } from "@/components/charts/dashboard-pie-chart";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  DashboardFeatureGrid,
  type DashboardFeatureLink,
} from "@/components/dashboard/dashboard-feature-grid";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SessionUser } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import {
  collectWarehousePermissions,
  hasSystemCapability,
} from "@/lib/system-permissions";
import { parseWarehouseAssignments } from "@/lib/warehouse-assignments";

export function WarehouseStaffDashboard() {
  const trpc = useTRPC();
  const session = authClient.useSession();
  const user = session.data?.user as SessionUser | undefined;
  const assignments = parseWarehouseAssignments(user?.warehouseAssignments);
  const warehousePermissions = collectWarehousePermissions(
    assignments.map((a) => ({ permissions: a.permissions })),
  );

  const summaryQuery = useQuery(trpc.dashboard.staffSummary.queryOptions());

  const ctx = { warehousePermissions };
  const canPick = hasSystemCapability(
    "WAREHOUSE_STAFF",
    "pick_operations",
    ctx,
  );
  const canPack = hasSystemCapability(
    "WAREHOUSE_STAFF",
    "pack_operations",
    ctx,
  );
  const canReceive = hasSystemCapability(
    "WAREHOUSE_STAFF",
    "receive_operations",
    ctx,
  );

  const featureLinks: DashboardFeatureLink[] = [
    canPick || canPack
      ? {
          title: "Orders",
          href: "/orders",
          description: "Pick, pack, and ship outbound orders",
          icon: PackageSearchIcon,
        }
      : null,
    canReceive
      ? {
          title: "Inbound",
          href: "/inbound/purchase-orders",
          description: "Receive purchase orders and ASN",
          icon: InboxIcon,
        }
      : null,
    {
      title: "Inventory",
      href: "/inventory",
      description: "Stock levels and product catalog",
      icon: ClipboardListIcon,
    },
    {
      title: "Locations",
      href: "/inventory/locations",
      description: "Bins, zones, and print bin labels",
      icon: MapPinIcon,
    },
    {
      title: "Printing",
      href: "/printing",
      description: "Print queue and label jobs",
      icon: PrinterIcon,
    },
  ].filter((link): link is DashboardFeatureLink => link !== null);

  const summary = summaryQuery.data;
  const pickTrendEmpty =
    !summaryQuery.isLoading &&
    (summary?.pickTrend.every((d) => d.units === 0) ?? true);

  const warehouseLabel =
    summary?.warehouses.map((w) => w.code ?? w.name).join(", ") ||
    "No warehouses assigned";

  return (
    <div className="space-y-8 p-6">
      <OperatorPageHeader
        description={`Floor operations — ${warehouseLabel}. Last 7 days.`}
        title="Dashboard"
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/orders">Go to orders</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="primary"
          hint="Pending or in progress"
          isLoading={summaryQuery.isLoading}
          label="Pick lists due"
          value={summary?.kpis.pickListsDue ?? 0}
        />
        <KpiStatCard
          accent="warning"
          hint="Awaiting receipt"
          isLoading={summaryQuery.isLoading}
          label="POs to receive"
          value={summary?.kpis.posToReceive ?? 0}
        />
        <KpiStatCard
          hint="Not yet fulfilled"
          isLoading={summaryQuery.isLoading}
          label="Open orders"
          value={summary?.kpis.openOrders ?? 0}
        />
        <KpiStatCard
          accent="success"
          hint={`${summary?.kpis.completedPicksToday ?? 0} lists completed today`}
          isLoading={summaryQuery.isLoading}
          label="Units picked today"
          value={summary?.kpis.unitsPickedToday ?? 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          description="Units picked from completed pick lists"
          isEmpty={pickTrendEmpty}
          isLoading={summaryQuery.isLoading}
          title="Pick productivity"
        >
          <DashboardLineChart
            data={summary?.pickTrend ?? []}
            series={[
              { dataKey: "units", name: "Units picked", color: "#3874ff" },
            ]}
            xKey="date"
          />
        </ChartCard>

        <ChartCard
          description="Work waiting in your assigned sites"
          isEmpty={!summary?.taskMix.length}
          isLoading={summaryQuery.isLoading}
          title="Today's workload"
        >
          <DashboardPieChart data={summary?.taskMix ?? []} />
        </ChartCard>
      </div>

      <DashboardFeatureGrid
        columns={3}
        description="Shortcuts for your daily warehouse tasks."
        links={featureLinks}
        title="Your workspace"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your permissions</CardTitle>
          <CardDescription>
            {warehousePermissions.length > 0
              ? warehousePermissions.join(" · ")
              : "No permissions assigned yet — ask your warehouse manager."}
          </CardDescription>
        </CardHeader>
        {assignments.length > 0 ? (
          <CardContent className="flex flex-wrap gap-2">
            {summary?.warehouses.map((w) => (
              <span
                key={w.id}
                className="rounded-full border px-3 py-1 text-xs font-medium"
              >
                {w.code ?? w.name}
              </span>
            ))}
          </CardContent>
        ) : (
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/inventory">
                Browse inventory
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

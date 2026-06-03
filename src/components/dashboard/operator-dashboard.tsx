"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  PackageIcon,
  TrendingUpIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { ChartCard } from "@/components/charts/chart-card";
import { DashboardBarChart } from "@/components/charts/dashboard-bar-chart";
import { DashboardLineChart } from "@/components/charts/dashboard-line-chart";
import { DashboardPieChart } from "@/components/charts/dashboard-pie-chart";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { DashboardFeatureGrid } from "@/components/dashboard/dashboard-feature-grid";
import { getOperatorDashboardLinks } from "@/components/dashboard/operator-dashboard-links";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOperatorRole } from "@/hooks/use-operator-role";

function SetupStep(
  props: Readonly<{
    done: boolean;
    title: string;
    description: string;
    href: string;
    actionLabel: string;
  }>,
) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 p-4">
      {props.done ? (
        <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
      ) : (
        <CircleIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{props.title}</p>
        <p className="text-xs text-muted-foreground">{props.description}</p>
        {!props.done ? (
          <Button asChild className="mt-2 h-8" size="sm" variant="outline">
            <Link href={props.href}>{props.actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function OperatorDashboard() {
  const trpc = useTRPC();
  const {
    isAccountOwner,
    canManageTeam,
    canCreateWarehouse,
    canCreateMerchant,
    canAccessOnboarding,
    canManageBilling,
    canManageLabelTemplates,
    canManageEscalationRules,
    canAssignWarehouseStaff,
  } = useOperatorRole();

  const operationsQuery = useQuery(
    trpc.analytics.operationsDashboard.queryOptions(),
  );
  const inventoryQuery = useQuery(
    trpc.analytics.inventoryHealth.queryOptions(),
  );
  const chartsQuery = useQuery(trpc.dashboard.operatorCharts.queryOptions());
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const teamQuery = useQuery({
    ...trpc.accountUser.list.queryOptions(),
    enabled: canManageTeam,
  });
  const merchantsQuery = useQuery(trpc.merchant.list.queryOptions());

  const warehouseCount = warehousesQuery.data?.length ?? 0;
  const teamCount =
    teamQuery.data?.filter((u) => u.systemRole !== "THREEPL_ACCOUNT_OWNER")
      .length ?? 0;
  const merchantCount = merchantsQuery.data?.length ?? 0;

  const ops = operationsQuery.data;
  const inventory = inventoryQuery.data;
  const charts = chartsQuery.data;

  const setupComplete =
    warehouseCount > 0 &&
    (!canManageTeam || teamCount > 0) &&
    (!canCreateMerchant || merchantCount > 0);

  const featureLinks = getOperatorDashboardLinks({
    canManageBilling,
    canManageTeam,
    canManageLabelTemplates,
    canManageEscalationRules,
    isAccountOwner,
  });

  const trendEmpty =
    !chartsQuery.isLoading &&
    (charts?.orderTrend.every((d) => d.created === 0 && d.fulfilled === 0) ??
      true);

  return (
    <div className="space-y-8 p-6">
      <OperatorPageHeader
        description={
          isAccountOwner
            ? "Operations overview for your 3PL workspace — last 14 days."
            : "Operations overview for your assigned warehouses — last 14 days."
        }
        title="Dashboard"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/analytics">Full analytics</Link>
            </Button>
            {canAccessOnboarding ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/onboarding">Setup wizard</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="primary"
          hint={`${ops?.pendingOrders ?? 0} pending fulfillment`}
          icon={PackageIcon}
          isLoading={operationsQuery.isLoading}
          label="Orders today"
          value={ops?.ordersToday ?? 0}
        />
        <KpiStatCard
          accent="success"
          hint={`SLA (7d): ${ops?.slaCompliancePct7d ?? 100}%`}
          icon={TrendingUpIcon}
          isLoading={operationsQuery.isLoading}
          label="Fulfillment rate"
          value={`${ops?.fulfillmentRatePct ?? 0}%`}
        />
        <KpiStatCard
          hint="Completed pick lists (7d avg)"
          icon={ClockIcon}
          isLoading={operationsQuery.isLoading}
          label="Avg pick time"
          value={`${ops?.avgPickTimeMins ?? 0}m`}
        />
        <KpiStatCard
          accent="warning"
          hint={`${inventory?.deadStockCount ?? 0} dead-stock SKUs`}
          icon={WarehouseIcon}
          isLoading={inventoryQuery.isLoading}
          label="Low-stock SKUs"
          value={inventory?.lowStockCount ?? 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          description="Orders created vs fulfilled per day"
          isEmpty={trendEmpty}
          isLoading={chartsQuery.isLoading}
          title="Order throughput"
        >
          <DashboardLineChart
            data={charts?.orderTrend ?? []}
            series={[
              { dataKey: "created", name: "Created", color: "#3874ff" },
              { dataKey: "fulfilled", name: "Fulfilled", color: "#25b003" },
            ]}
            xKey="date"
          />
        </ChartCard>

        <ChartCard
          description="Share of orders in each fulfillment state"
          isEmpty={!charts?.statusMix.length}
          isLoading={chartsQuery.isLoading}
          title="Fulfillment mix"
        >
          <DashboardPieChart data={charts?.statusMix ?? []} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          description="Order volume by warehouse site"
          isEmpty={!charts?.byWarehouse.length}
          isLoading={chartsQuery.isLoading}
          title="Orders by warehouse"
        >
          <DashboardBarChart data={charts?.byWarehouse ?? []} />
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top merchants (open orders)
            </CardTitle>
            <CardDescription>
              Brands with the largest active backlog
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : charts?.topMerchants.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charts.topMerchants.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.openOrders}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No open orders across merchants.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DashboardFeatureGrid
        columns={4}
        description="Jump into every module — fulfillment, inventory, merchants, and settings."
        links={featureLinks}
        title="Workspace modules"
      />

      {isAccountOwner ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace setup</CardTitle>
              <CardDescription>
                Complete these steps to run end-to-end flows as a 3PL account
                owner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {setupComplete ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  Core setup complete — explore modules above.
                </div>
              ) : null}
              {canCreateWarehouse ? (
                <SetupStep
                  actionLabel="Add warehouse"
                  description="At least one site for inventory and fulfillment."
                  done={warehouseCount > 0}
                  href="/settings/warehouses"
                  title={`Warehouses (${warehouseCount})`}
                />
              ) : null}
              {canManageTeam ? (
                <SetupStep
                  actionLabel="Invite team"
                  description="Warehouse managers and staff with role assignments."
                  done={teamCount > 0}
                  href="/settings/users"
                  title={`Team members (${teamCount})`}
                />
              ) : null}
              {canCreateMerchant ? (
                <SetupStep
                  actionLabel="Add merchant"
                  description="Client brand with owner invite to the merchant portal."
                  done={merchantCount > 0}
                  href="/merchants"
                  title={`Merchants (${merchantCount})`}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory snapshot</CardTitle>
              <CardDescription>
                Live health metrics from your catalog
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Active SKUs</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {inventoryQuery.isLoading ? "—" : (inventory?.totalSkus ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Units on hand</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {inventoryQuery.isLoading
                    ? "—"
                    : (inventory?.totalUnits ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Top movers (30d)
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {inventoryQuery.isLoading
                    ? "—"
                    : (inventory?.top10Movers?.length ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Dead stock</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {inventoryQuery.isLoading
                    ? "—"
                    : (inventory?.deadStockCount ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!isAccountOwner && warehouseCount === 0 ? (
        <Badge variant="secondary">Add a warehouse to unlock full flows</Badge>
      ) : null}

      {canAssignWarehouseStaff && !canManageTeam ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/staff">Staff assignments</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2Icon,
  HeadphonesIcon,
  LayoutDashboardIcon,
  ShieldIcon,
  StethoscopeIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { ChartCard } from "@/components/charts/chart-card";
import { DashboardBarChart } from "@/components/charts/dashboard-bar-chart";
import { DashboardLineChart } from "@/components/charts/dashboard-line-chart";
import { DashboardPieChart } from "@/components/charts/dashboard-pie-chart";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { DashboardFeatureGrid } from "@/components/dashboard/dashboard-feature-grid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PLATFORM_FEATURES = [
  {
    title: "Tenant accounts",
    href: "/platform/accounts",
    description: "Browse 3PL workspaces and account health",
    icon: Building2Icon,
  },
  {
    title: "Support console",
    href: "/platform/support",
    description: "Read-only or escalated tenant support sessions",
    icon: HeadphonesIcon,
    badge: "Support",
  },
  {
    title: "Audit log",
    href: "/platform/audit",
    description: "Cross-tenant actions and impersonation history",
    icon: ShieldIcon,
  },
  {
    title: "Security",
    href: "/platform/security",
    description: "Platform-wide security policies",
    icon: ShieldIcon,
  },
  {
    title: "Diagnostics",
    href: "/platform/diagnostics",
    description: "System health and integration checks",
    icon: StethoscopeIcon,
  },
  {
    title: "Billing",
    href: "/platform/billing",
    description: "Polar plans and subscription overview",
    icon: LayoutDashboardIcon,
  },
] as const;

export function PlatformDashboard() {
  const trpc = useTRPC();
  const overviewQuery = useQuery(trpc.platform.overview.queryOptions());
  const chartsQuery = useQuery(trpc.platform.dashboardCharts.queryOptions());
  const accountsQuery = useQuery(trpc.platform.listAccounts.queryOptions());

  const overview = overviewQuery.data;
  const charts = chartsQuery.data;

  const trendEmpty =
    !chartsQuery.isLoading &&
    (charts?.orderTrend.every((d) => d.orders === 0) ?? true);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Platform dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            LogIQ internal console — cross-tenant visibility. Last 14 days.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/platform/support">Open support</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="primary"
          icon={Building2Icon}
          isLoading={overviewQuery.isLoading}
          label="Tenant accounts"
          value={overview?.accountCount ?? 0}
        />
        <KpiStatCard
          icon={LayoutDashboardIcon}
          isLoading={overviewQuery.isLoading}
          label="Warehouses"
          value={overview?.warehouseCount ?? 0}
        />
        <KpiStatCard
          icon={UsersIcon}
          isLoading={overviewQuery.isLoading}
          label="Merchants"
          value={overview?.merchantCount ?? 0}
        />
        <KpiStatCard
          accent="success"
          isLoading={overviewQuery.isLoading}
          label="Orders (all time)"
          value={overview?.orderCount ?? 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          description="Orders created across all tenants"
          isEmpty={trendEmpty}
          isLoading={chartsQuery.isLoading}
          title="Platform order volume"
        >
          <DashboardLineChart
            data={charts?.orderTrend ?? []}
            series={[{ dataKey: "orders", name: "Orders", color: "#3874ff" }]}
            xKey="date"
          />
        </ChartCard>

        <ChartCard
          description="Distribution of subscription plans"
          isEmpty={!charts?.planMix.length}
          isLoading={chartsQuery.isLoading}
          title="Tenants by plan"
        >
          <DashboardPieChart data={charts?.planMix ?? []} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          description="Highest order volume by 3PL account"
          isEmpty={!charts?.topTenants.length}
          isLoading={chartsQuery.isLoading}
          title="Top tenants"
        >
          <DashboardBarChart data={charts?.topTenants ?? []} />
        </ChartCard>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                Recent tenant accounts
              </CardTitle>
              <CardDescription>
                Start support from the Support page or view account details.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/platform/accounts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading accounts…</p>
            ) : null}
            {accountsQuery.data?.slice(0, 6).map((account) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-3 last:border-0"
                key={account.id}
              >
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.plan} · {account.warehouseCount} warehouses ·{" "}
                    {account.merchantCount} merchants
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/platform/accounts/${account.id}`}>Details</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <DashboardFeatureGrid
        columns={3}
        description="Platform tools for internal LogIQ operators."
        links={[...PLATFORM_FEATURES]}
        title="Platform modules"
      />
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

function formatPlanLabel(plan: string): string {
  if (!plan) return "Free";
  const rest = plan.slice(1).toLowerCase().replaceAll("_", " ");
  return plan.charAt(0).toUpperCase() + rest;
}

export function PlatformDashboard() {
  const trpc = useTRPC();
  const overviewQuery = useQuery(trpc.platform.overview.queryOptions());
  const chartsQuery = useQuery(trpc.platform.dashboardCharts.queryOptions());
  const accountsQuery = useQuery(trpc.platform.listAccounts.queryOptions());

  const overview = overviewQuery.data;
  const charts = chartsQuery.data;
  const recentAccounts = accountsQuery.data?.slice(0, 6) ?? [];

  const trendEmpty =
    !chartsQuery.isLoading &&
    (charts?.orderTrend.every((d) => d.orders === 0) ?? true);

  return (
    <div className="space-y-8 p-6">
      <OperatorPageHeader
        title="Platform dashboard"
        description="LogIQ internal console — cross-tenant visibility. Last 14 days."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/platform/accounts">All accounts</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/platform/support">Open support</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          icon={Building2Icon}
          isLoading={overviewQuery.isLoading}
          label="Tenant accounts"
          value={overview?.accountCount ?? 0}
        />
        <KpiStatCard
          accent="navy"
          icon={LayoutDashboardIcon}
          isLoading={overviewQuery.isLoading}
          label="Warehouses"
          value={overview?.warehouseCount ?? 0}
        />
        <KpiStatCard
          accent="navy-violet"
          icon={UsersIcon}
          isLoading={overviewQuery.isLoading}
          label="Merchants"
          value={overview?.merchantCount ?? 0}
        />
        <KpiStatCard
          accent="navy-teal"
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

        <Card className="dashboard-chart-card ring-0">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold">
                Recent tenant accounts
              </CardTitle>
              <CardDescription>
                Start support from the Support page or open account details.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/platform/accounts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {accountsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : recentAccounts.length ? (
              recentAccounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/platform/accounts/${account.id}`}
                  className={cn(
                    "platform-interactive-item group flex items-center justify-between gap-3 px-3 py-3",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="platform-module-title truncate text-sm font-semibold transition-colors duration-200">
                        {account.name}
                      </p>
                      <Badge
                        variant="secondary"
                        className="platform-module-badge h-5 rounded-md border-0 bg-[#0b213a]/8 px-1.5 text-[10px] font-medium text-[#0b213a] transition-colors duration-200 dark:bg-white/10 dark:text-white/90"
                      >
                        {formatPlanLabel(account.plan)}
                      </Badge>
                    </div>
                    <p className="platform-module-desc mt-0.5 text-xs text-muted-foreground transition-colors duration-200">
                      {account.warehouseCount} warehouses ·{" "}
                      {account.merchantCount} merchants · {account.orderCount}{" "}
                      orders
                    </p>
                  </div>
                  <span className="platform-module-cta inline-flex shrink-0 items-center text-xs font-medium text-[#1a4fd6] opacity-0 transition-all duration-200 group-hover:opacity-100">
                    Details
                    <ArrowRightIcon className="ml-1 size-3.5" />
                  </span>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No tenant accounts yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DashboardFeatureGrid
        columns={3}
        description="Platform tools for internal LogIQ operators."
        links={[...PLATFORM_FEATURES]}
        title="Platform modules"
        variant="platform"
      />
    </div>
  );
}

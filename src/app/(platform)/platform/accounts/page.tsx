"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2Icon,
  PackageIcon,
  UserXIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { PlatformOpenAccountButton } from "@/components/platform/platform-account-actions";
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

function formatPlanLabel(plan: string): string {
  if (!plan) return "Free";
  const rest = plan.slice(1).toLowerCase().replaceAll("_", " ");
  return plan.charAt(0).toUpperCase() + rest;
}

export default function PlatformAccountsPage() {
  const trpc = useTRPC();
  const accountsQuery = useQuery(trpc.platform.listAccounts.queryOptions());
  const statsQuery = useQuery(trpc.platform.accountsPageStats.queryOptions());

  const stats = statsQuery.data;
  const accounts = accountsQuery.data ?? [];

  return (
    <div className="space-y-8 p-6">
      <OperatorPageHeader
        title="Accounts"
        description="All customer 3PL workspaces on the platform."
        actions={
          <Button asChild size="sm">
            <Link href="/platform/support">Support console</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          icon={Building2Icon}
          isLoading={statsQuery.isLoading}
          label="Tenant accounts"
          value={stats?.accountCount ?? 0}
        />
        <KpiStatCard
          accent="navy-teal"
          hint={`${stats?.ordersThisMonth ?? 0} this month`}
          icon={PackageIcon}
          isLoading={statsQuery.isLoading}
          label="Orders (all time)"
          value={stats?.orderCount ?? 0}
        />
        <KpiStatCard
          accent="navy"
          icon={WarehouseIcon}
          isLoading={statsQuery.isLoading}
          label="Warehouses · Merchants"
          value={
            statsQuery.isLoading
              ? "—"
              : `${stats?.warehouseCount ?? 0} · ${stats?.merchantCount ?? 0}`
          }
        />
        <KpiStatCard
          accent="navy-violet"
          icon={UserXIcon}
          isLoading={statsQuery.isLoading}
          label="Inactive users"
          value={
            statsQuery.isLoading
              ? "—"
              : `${stats?.inactiveOperators ?? 0} op · ${stats?.inactiveMerchants ?? 0} mch`
          }
        />
      </div>

      {stats?.planCounts ? (
        <Card className="dashboard-chart-card ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Plans</CardTitle>
            <CardDescription>
              Active subscription tiers across tenant accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stats.planCounts).map(([plan, count]) => (
              <Badge
                key={plan}
                variant="secondary"
                className="rounded-md border-0 bg-[#0b213a] px-2.5 py-1 text-xs font-medium text-white"
              >
                {formatPlanLabel(plan)}: {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {accountsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : accounts.length ? (
          accounts.map((account) => (
            <Card
              key={account.id}
              className={cn(
                "group platform-interactive-item dashboard-chart-card ring-0",
              )}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="min-w-0 space-y-0.5">
                  <CardTitle className="platform-module-title text-base font-bold transition-colors duration-200">
                    {account.name}
                  </CardTitle>
                  <CardDescription className="platform-module-desc transition-colors duration-200">
                    {account.slug}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className="platform-module-badge shrink-0 rounded-md border-0 bg-[#0b213a] px-2 py-0.5 text-[10px] font-medium text-white transition-colors duration-200"
                >
                  {formatPlanLabel(account.plan)}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0">
                <p className="platform-module-desc text-sm transition-colors duration-200">
                  {account.warehouseCount} warehouses · {account.merchantCount}{" "}
                  merchants · {account.orderCount} orders · {account.userCount}{" "}
                  users
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    className="platform-account-action transition-colors duration-200"
                    size="sm"
                    variant="outline"
                  >
                    <Link href={`/platform/accounts/${account.id}`}>
                      Details
                    </Link>
                  </Button>
                  <PlatformOpenAccountButton
                    accountId={account.id}
                    accountName={account.name}
                    className="platform-account-action transition-colors duration-200"
                  />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
            No tenant accounts yet.
          </p>
        )}
      </div>
    </div>
  );
}

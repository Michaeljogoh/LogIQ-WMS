"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2Icon,
  CreditCardIcon,
  PackageIcon,
  TagsIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { PlatformOpenAccountButton } from "@/components/platform/platform-account-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function capLabel(n: number | null) {
  if (n === null) {
    return "Unlimited";
  }
  return String(n);
}

export default function PlatformBillingPage() {
  const trpc = useTRPC();
  const billingQuery = useQuery(trpc.platform.listBilling.queryOptions());

  const data = billingQuery.data;
  const summary = data?.summary;

  return (
    <div className="space-y-8 p-6">
      <OperatorPageHeader
        title="Platform billing"
        description="Plans, Polar linkage, and monthly usage across all tenant accounts."
      />

      {!data?.polarConfigured ? (
        <Card className="platform-support-alert platform-support-alert--active ring-0">
          <CardContent className="py-4 text-sm text-amber-950 dark:text-amber-100">
            Polar is not configured (missing{" "}
            <code className="text-xs">POLAR_ACCESS_TOKEN</code>). Plan and usage
            data below are from LogIQ; live subscriptions require Polar.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          icon={Building2Icon}
          isLoading={billingQuery.isLoading}
          label="Tenant accounts"
          value={summary?.accountCount ?? 0}
        />
        <KpiStatCard
          accent="navy-violet"
          icon={CreditCardIcon}
          isLoading={billingQuery.isLoading}
          label="Polar linked"
          value={
            billingQuery.isLoading
              ? "—"
              : `${summary?.polarLinkedCount ?? 0} / ${summary?.accountCount ?? 0}`
          }
        />
        <KpiStatCard
          accent="navy-teal"
          icon={PackageIcon}
          isLoading={billingQuery.isLoading}
          label="Orders this month"
          value={summary?.totalOrdersThisMonth ?? 0}
        />
        <KpiStatCard
          accent="navy"
          icon={TagsIcon}
          isLoading={billingQuery.isLoading}
          label="Labels this month"
          value={summary?.totalLabelsThisMonth ?? 0}
        />
      </div>

      {summary ? (
        <Card className="dashboard-chart-card platform-support-panel ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Plans breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="rounded-md border-0 bg-[#0b213a] px-2.5 py-1 text-xs font-medium text-white"
            >
              Starter: {summary.planCounts.STARTER}
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-md border-0 bg-[#0b213a] px-2.5 py-1 text-xs font-medium text-white"
            >
              Growth: {summary.planCounts.GROWTH}
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-md border-0 bg-[#0b213a] px-2.5 py-1 text-xs font-medium text-white"
            >
              Enterprise: {summary.planCounts.ENTERPRISE}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card className="dashboard-chart-card platform-support-panel ring-0">
        <CardHeader>
          <CardTitle className="text-base font-bold">All accounts</CardTitle>
          <CardDescription>
            Subscription plan, Polar customer linkage, and current-month usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {billingQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : null}
          {billingQuery.isError ? (
            <p className="text-sm text-destructive">
              {billingQuery.error.message}
            </p>
          ) : null}
          {!billingQuery.isLoading && !billingQuery.isError ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Polar</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Orders (mo)</TableHead>
                  <TableHead>Labels (mo)</TableHead>
                  <TableHead>Warehouses</TableHead>
                  <TableHead>Merchants</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.accounts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="rounded-md border-0 bg-[#0b213a]/8 px-2 py-0.5 text-[10px] font-medium text-[#0b213a] dark:bg-white/10 dark:text-white/90"
                      >
                        {row.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.polarLinked ? (
                        <Badge
                          variant="secondary"
                          className="rounded-md border-0 bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                        >
                          Linked
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not linked
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">
                      {row.ownerEmail ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[120px] space-y-1">
                        <p className="text-sm tabular-nums">
                          {row.usage.ordersThisMonth} /{" "}
                          {capLabel(row.limits.ordersPerMonth)}
                        </p>
                        {row.usage.ordersUtilizationPct != null ? (
                          <Progress value={row.usage.ordersUtilizationPct} />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.usage.labelsThisMonth}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {row.warehouseCount}
                      {row.limits.warehouses != null
                        ? ` / ${row.limits.warehouses}`
                        : ""}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {row.merchantCount}
                      {row.limits.merchants != null
                        ? ` / ${row.limits.merchants}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Badge
                          asChild
                          variant="secondary"
                          className="rounded-md border-0 bg-[#0b213a] px-2.5 py-1 text-[10px] font-medium text-white transition-colors duration-200"
                        >
                          <Link href={`/platform/accounts/${row.id}`}>
                            Details
                          </Link>
                        </Badge>
                        <PlatformOpenAccountButton
                          accountId={row.id}
                          accountName={row.name}
                          label="Support"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.accounts.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-sm text-muted-foreground"
                      colSpan={9}
                    >
                      No tenant accounts yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Plans, Polar linkage, and monthly usage across all tenant accounts.
        </p>
      </div>

      {!data?.polarConfigured ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="py-4 text-sm text-amber-950 dark:text-amber-100">
            Polar is not configured (missing{" "}
            <code className="text-xs">POLAR_ACCESS_TOKEN</code>). Plan and usage
            data below are from LogIQ; live subscriptions require Polar.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tenant accounts</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {billingQuery.isLoading ? "—" : (summary?.accountCount ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Polar linked</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {billingQuery.isLoading
                ? "—"
                : `${summary?.polarLinkedCount ?? 0} / ${summary?.accountCount ?? 0}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders this month</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {billingQuery.isLoading
                ? "—"
                : (summary?.totalOrdersThisMonth ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Labels this month</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {billingQuery.isLoading
                ? "—"
                : (summary?.totalLabelsThisMonth ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {summary ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plans breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            <Badge variant="secondary">
              Starter: {summary.planCounts.STARTER}
            </Badge>
            <Badge variant="secondary">
              Growth: {summary.planCounts.GROWTH}
            </Badge>
            <Badge variant="secondary">
              Enterprise: {summary.planCounts.ENTERPRISE}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All accounts</CardTitle>
          <CardDescription>
            Subscription plan, Polar customer linkage, and current-month usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {billingQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading billing…</p>
          ) : null}
          {billingQuery.isError ? (
            <p className="text-sm text-destructive">
              {billingQuery.error.message}
            </p>
          ) : null}
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
                    <Badge variant="outline">{row.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.polarLinked ? (
                      <Badge variant="secondary">Linked</Badge>
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
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/platform/accounts/${row.id}`}>
                          Details
                        </Link>
                      </Button>
                      <PlatformOpenAccountButton
                        accountId={row.id}
                        accountName={row.name}
                        label="Support"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!billingQuery.isLoading &&
              (data?.accounts.length ?? 0) === 0 ? (
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
        </CardContent>
      </Card>
    </div>
  );
}

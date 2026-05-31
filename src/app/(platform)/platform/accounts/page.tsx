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

export default function PlatformAccountsPage() {
  const trpc = useTRPC();
  const accountsQuery = useQuery(trpc.platform.listAccounts.queryOptions());
  const statsQuery = useQuery(trpc.platform.accountsPageStats.queryOptions());

  const stats = statsQuery.data;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          All customer 3PL workspaces on the platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tenant accounts</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {statsQuery.isLoading ? "—" : (stats?.accountCount ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders (all time)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {statsQuery.isLoading ? "—" : (stats?.orderCount ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {stats?.ordersThisMonth ?? 0} this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Warehouses · Merchants</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {statsQuery.isLoading
                ? "—"
                : `${stats?.warehouseCount ?? 0} · ${stats?.merchantCount ?? 0}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive users</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {statsQuery.isLoading
                ? "—"
                : `${stats?.inactiveOperators ?? 0} op · ${stats?.inactiveMerchants ?? 0} mch`}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {stats?.planCounts ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plans</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stats.planCounts).map(([plan, count]) => (
              <Badge key={plan} variant="secondary">
                {plan}: {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {accountsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      ) : null}

      <div className="grid gap-4">
        {accountsQuery.data?.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base">{account.name}</CardTitle>
                <CardDescription>{account.slug}</CardDescription>
              </div>
              <Badge variant="secondary">{account.plan}</Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {account.warehouseCount} warehouses · {account.merchantCount}{" "}
                merchants · {account.orderCount} orders · {account.userCount}{" "}
                users
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/platform/accounts/${account.id}`}>Details</Link>
                </Button>
                <PlatformOpenAccountButton
                  accountId={account.id}
                  accountName={account.name}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

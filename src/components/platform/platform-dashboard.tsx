"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PlatformDashboard() {
  const trpc = useTRPC();
  const overviewQuery = useQuery(trpc.platform.overview.queryOptions());
  const accountsQuery = useQuery(trpc.platform.listAccounts.queryOptions());

  const overview = overviewQuery.data;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          LogIQ internal console — cross-tenant visibility and support access.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tenant accounts</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {overviewQuery.isLoading ? "—" : (overview?.accountCount ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Warehouses</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {overviewQuery.isLoading ? "—" : (overview?.warehouseCount ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Merchants</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {overviewQuery.isLoading ? "—" : (overview?.merchantCount ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {overviewQuery.isLoading ? "—" : (overview?.orderCount ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Recent tenant accounts</CardTitle>
            <CardDescription>
              Start read-only or approved emergency support from the Support page.
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
          {accountsQuery.data?.slice(0, 8).map((account) => (
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
                <Link href={`/platform/accounts/${account.id}`}>
                  Details
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/platform/support">Support</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

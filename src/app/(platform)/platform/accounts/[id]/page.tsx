"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
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

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

export default function PlatformAccountDetailPage(props: PageProps) {
  const { id } = use(props.params);
  const trpc = useTRPC();
  const accountQuery = useQuery(
    trpc.platform.getAccount.queryOptions({ accountId: id }),
  );

  const account = accountQuery.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild className="mb-3" size="sm" variant="outline">
            <Link href="/platform/accounts">← Accounts</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {account?.name ?? "Account"}
          </h1>
          <p className="text-sm text-muted-foreground">{account?.slug}</p>
        </div>
        {account ? (
          <PlatformOpenAccountButton
            accountId={account.id}
            accountName={account.name}
          />
        ) : null}
      </div>

      {accountQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {account ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription>Tenant metadata and usage</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Plan</span>
              <br />
              <Badge className="mt-1" variant="secondary">
                {account.plan}
              </Badge>
            </p>
            <p>
              <span className="text-muted-foreground">Warehouses</span>
              <br />
              {account.warehouseCount}
            </p>
            <p>
              <span className="text-muted-foreground">Merchants</span>
              <br />
              {account.merchantCount}
            </p>
            <p>
              <span className="text-muted-foreground">Orders</span>
              <br />
              {account.orderCount}
            </p>
            <p>
              <span className="text-muted-foreground">Users</span>
              <br />
              {account.userCount}
            </p>
            <p>
              <span className="text-muted-foreground">Polar customer</span>
              <br />
              {account.polarCustomerId ?? "—"}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

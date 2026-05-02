"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
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

export default function BillingSettingsPage() {
  const trpc = useTRPC();
  const subQuery = useQuery(trpc.billing.getSubscription.queryOptions());
  const usageQuery = useQuery(trpc.billing.getUsage.queryOptions());
  const invoicesQuery = useQuery(trpc.billing.getInvoices.queryOptions());

  const portalMut = useMutation(
    trpc.billing.getPortalUrl.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.portalUrl;
      },
    }),
  );

  const account = subQuery.data?.account;
  const limits = usageQuery.data?.limits;
  const usage = usageQuery.data?.usage;

  const orderProgressValue =
    limits?.ordersPerMonth != null && limits.ordersPerMonth > 0
      ? Math.min(
          100,
          ((usage?.ordersThisMonth ?? 0) / limits.ordersPerMonth) * 100,
        )
      : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            LogIQ subscription via Polar — usage and invoices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/billing/upgrade">Change plan</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={portalMut.isPending || !account?.polarCustomerId}
            onClick={() => portalMut.mutate()}
          >
            Customer portal
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            Stored on your organisation; updated from Polar webhooks after
            checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Plan:</span>{" "}
            <Badge variant="outline">{account?.plan ?? "—"}</Badge>
          </p>
          {subQuery.data?.subscription ? (
            <p>
              <span className="text-muted-foreground">Polar status:</span>{" "}
              {subQuery.data.subscription.status}
            </p>
          ) : null}
          {!subQuery.data?.polarConfigured ? (
            <p className="text-amber-600 dark:text-amber-500">
              Polar access token is not configured — subscription API calls are
              skipped. Set POLAR_ACCESS_TOKEN for live billing.
            </p>
          ) : null}
          {!account?.polarCustomerId ? (
            <p className="text-muted-foreground">
              Complete a checkout (upgrade) to link a Polar customer to this
              organisation.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage this month</CardTitle>
          <CardDescription>
            Operational counters in LogIQ (orders created, labels purchased).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usageQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Orders</span>
                  <span>
                    {usage?.ordersThisMonth ?? 0} /{" "}
                    {capLabel(limits?.ordersPerMonth ?? null)}
                  </span>
                </div>
                <Progress value={orderProgressValue} />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Labels bought:</span>{" "}
                {usage?.labelsThisMonth ?? 0}
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <span>
                  Warehouse cap: {capLabel(limits?.warehouses ?? null)}
                </span>
                <span>Merchant cap: {capLabel(limits?.merchants ?? null)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Polar orders for your linked customer (PDF when generated).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoicesQuery.data?.items ?? []).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {(inv.totalAmount / 100).toFixed(2)} {inv.currency}
                  </TableCell>
                  <TableCell>{inv.paid ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    {inv.invoicePdfUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={inv.invoicePdfUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          PDF
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!invoicesQuery.data?.items?.length &&
              !invoicesQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="text-center text-sm text-muted-foreground"
                    colSpan={4}
                  >
                    No invoices yet or Polar customer not linked.
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

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, FileText, Package, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <SettingsPage>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/settings/billing/plan">Change plan</Link>
            </Button>
            <Button
              disabled={portalMut.isPending || !account?.polarCustomerId}
              onClick={() => portalMut.mutate()}
              type="button"
              variant="secondary"
            >
              Customer portal
            </Button>
          </div>
        }
        description="LogIQ subscription via Polar — usage, plan limits, and invoices."
        title="Billing overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint={
            subQuery.data?.subscription
              ? `Polar: ${subQuery.data.subscription.status}`
              : "Subscription status"
          }
          icon={CreditCard}
          isLoading={subQuery.isLoading}
          label="Current plan"
          value={account?.plan ?? "—"}
        />
        <KpiStatCard
          accent="navy-teal"
          hint={`Limit: ${capLabel(limits?.ordersPerMonth ?? null)} orders`}
          icon={TrendingUp}
          isLoading={usageQuery.isLoading}
          label="Orders this month"
          value={usage?.ordersThisMonth ?? 0}
        />
        <KpiStatCard
          accent="success"
          hint="Shipping labels purchased"
          icon={Package}
          isLoading={usageQuery.isLoading}
          label="Labels bought"
          value={usage?.labelsThisMonth ?? 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsPanel>
          <SettingsPanelHeader
            description="Stored on your organisation; updated from Polar webhooks after checkout."
            icon={CreditCard}
            title="Current plan"
          />
          <SettingsPanelBody className="space-y-3 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <Badge className="mt-1" variant="outline">
                  {account?.plan ?? "—"}
                </Badge>
              </div>
            </div>
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
          </SettingsPanelBody>
        </SettingsPanel>

        <SettingsPanel>
          <SettingsPanelHeader
            description="Operational counters in LogIQ (orders created, labels purchased)."
            icon={TrendingUp}
            title="Usage this month"
          />
          <SettingsPanelBody className="space-y-4">
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
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>
                    Warehouse cap: {capLabel(limits?.warehouses ?? null)}
                  </span>
                  <span>
                    Merchant cap: {capLabel(limits?.merchants ?? null)}
                  </span>
                </div>
              </>
            )}
          </SettingsPanelBody>
        </SettingsPanel>
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Polar orders for your linked customer (PDF when generated)."
          icon={FileText}
          title="Invoices"
        />
        <SettingsPanelBody>
          <SettingsTableWrap>
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
                    <TableCell>
                      {inv.paid ? (
                        <Badge variant="success">Paid</Badge>
                      ) : (
                        <Badge variant="secondary">Unpaid</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.invoicePdfUrl ? (
                        <Button asChild size="sm" variant="outline">
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
          </SettingsTableWrap>
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

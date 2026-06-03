"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  BotIcon,
  CreditCardIcon,
  MessageSquareIcon,
  PackageIcon,
  PlugIcon,
  SettingsIcon,
  SparklesIcon,
  TrendingUpIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { ChartCard } from "@/components/charts/chart-card";
import { DashboardLineChart } from "@/components/charts/dashboard-line-chart";
import { DashboardPieChart } from "@/components/charts/dashboard-pie-chart";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { DashboardFeatureGrid } from "@/components/dashboard/dashboard-feature-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PORTAL_FEATURES = [
  {
    title: "LogIQ chat",
    href: "/portal/chat",
    description: "Ask questions about your orders, stock, and invoices",
    icon: BotIcon,
    badge: "AI",
  },
  {
    title: "Billing",
    href: "/portal/billing",
    description: "View invoices, fees, and payment history",
    icon: CreditCardIcon,
  },
  {
    title: "Team",
    href: "/portal/team",
    description: "Invite users and manage portal permissions",
    icon: UsersIcon,
  },
  {
    title: "Integrations",
    href: "/portal/settings/integrations",
    description: "Connect Shopify, Amazon, and marketplaces",
    icon: PlugIcon,
  },
  {
    title: "Settings",
    href: "/portal/settings",
    description: "Profile, security, and notification preferences",
    icon: SettingsIcon,
  },
  {
    title: "Support",
    href: "/portal/chat",
    description: "Message your 3PL about fulfillment",
    icon: MessageSquareIcon,
  },
] as const;

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatIntegrationType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shipmentStatusTone(status: string) {
  if (status === "DELIVERED") return "text-emerald-600 bg-emerald-500/10";
  if (status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY") {
    return "text-[#3874ff] bg-[#3874ff]/10";
  }
  if (status === "EXCEPTION" || status === "RETURNED") {
    return "text-amber-600 bg-amber-500/10";
  }
  return "text-muted-foreground bg-muted";
}

export function MerchantPortalDashboard() {
  const trpc = useTRPC();
  const dashboardQuery = useQuery(trpc.merchant.portalDashboard.queryOptions());
  const data = dashboardQuery.data;

  const orderTrendEmpty =
    !dashboardQuery.isLoading &&
    (data?.orderTrend.every((d) => d.orders === 0 && d.shipped === 0) ?? true);

  const shipmentTotal14d =
    data?.shipmentTrend.reduce((sum, row) => sum + row.shipments, 0) ?? 0;

  return (
    <div className="min-h-full bg-gradient-to-b from-muted/30 via-background to-background">
      <div className="space-y-8 p-6 pb-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-[#3874ff]/15 bg-gradient-to-br from-[#3874ff]/12 via-background to-background p-6 shadow-sm sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#3874ff]/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="border-[#3874ff]/20 bg-[#3874ff]/10 text-[#3874ff]"
                >
                  <SparklesIcon className="mr-1 size-3" />
                  Merchant portal
                </Badge>
                {data?.integration ? (
                  <Badge variant="outline" className="gap-1">
                    <PlugIcon className="size-3" />
                    {formatIntegrationType(data.integration.type)}{" "}
                    <span
                      className={cn(
                        "font-medium",
                        data.integration.status === "CONNECTED"
                          ? "text-emerald-600"
                          : "text-amber-600",
                      )}
                    >
                      · {data.integration.status.toLowerCase()}
                    </span>
                  </Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {dashboardQuery.isLoading
                  ? "Loading…"
                  : `Welcome back, ${data?.merchantName ?? "Brand"}`}
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                Track fulfillment, inventory health, and billing with your 3PL
                partner — all in one place. Data below covers the last{" "}
                {data?.periodDays ?? 14} days.
              </p>
              {data?.integration?.shopDomain ? (
                <p className="text-xs text-muted-foreground">
                  Connected store:{" "}
                  <span className="font-medium text-foreground">
                    {data.integration.shopDomain}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-[#3874ff] hover:bg-[#3874ff]/90">
                <Link href="/portal/chat">
                  <BotIcon className="mr-2 size-4" />
                  Ask LogIQ
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/portal/billing">View billing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiStatCard
            accent="primary"
            hint="Awaiting fulfillment"
            icon={PackageIcon}
            isLoading={dashboardQuery.isLoading}
            label="Open orders"
            value={data?.openOrders ?? 0}
          />
          <KpiStatCard
            accent="warning"
            hint={`${data?.lowStockCount ?? 0} SKUs below threshold`}
            icon={AlertTriangleIcon}
            isLoading={dashboardQuery.isLoading}
            label="Low stock"
            value={data?.lowStockCount ?? 0}
          />
          <KpiStatCard
            accent="success"
            hint="Last 7 days"
            icon={TrendingUpIcon}
            isLoading={dashboardQuery.isLoading}
            label="Fulfillment rate"
            value={`${data?.fulfillmentRate7d ?? 0}%`}
          />
          <KpiStatCard
            hint={`${shipmentTotal14d} in last 14 days`}
            icon={TruckIcon}
            isLoading={dashboardQuery.isLoading}
            label="Shipments"
            value={data?.recentShipments.length ?? 0}
          />
          <KpiStatCard
            hint={`${data?.totalSkus ?? 0} active SKUs`}
            icon={WarehouseIcon}
            isLoading={dashboardQuery.isLoading}
            label="Units on hand"
            value={(data?.unitsOnHand ?? 0).toLocaleString()}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            className="border-border/60 shadow-sm lg:col-span-2"
            description="Orders placed vs fulfilled per day"
            isEmpty={orderTrendEmpty}
            isLoading={dashboardQuery.isLoading}
            title="Order activity"
          >
            <DashboardLineChart
              data={data?.orderTrend ?? []}
              series={[
                { dataKey: "orders", name: "Orders", color: "#3874ff" },
                { dataKey: "shipped", name: "Fulfilled", color: "#25b003" },
              ]}
              xKey="date"
            />
          </ChartCard>

          <ChartCard
            className="border-border/60 shadow-sm"
            description="Open orders by fulfillment status"
            isEmpty={!data?.statusMix.length}
            isLoading={dashboardQuery.isLoading}
            title="Open order mix"
          >
            <DashboardPieChart data={data?.statusMix ?? []} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            className="border-border/60 shadow-sm lg:col-span-2"
            description="Outbound labels created per day"
            isEmpty={
              !dashboardQuery.isLoading &&
              (data?.shipmentTrend.every((d) => d.shipments === 0) ?? true)
            }
            isLoading={dashboardQuery.isLoading}
            title="Shipment trend"
          >
            <DashboardLineChart
              data={data?.shipmentTrend ?? []}
              series={[
                { dataKey: "shipments", name: "Shipments", color: "#0097eb" },
              ]}
              xKey="date"
            />
          </ChartCard>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Latest invoice</CardTitle>
              <CardDescription>Most recent billing period</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : data?.latestInvoice ? (
                <div className="space-y-3">
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatCents(data.latestInvoice.totalCents)}
                  </p>
                  <p className="text-sm font-medium">
                    {data.latestInvoice.invoiceNumber}
                  </p>
                  <Badge variant="outline">{data.latestInvoice.status}</Badge>
                  <Button asChild className="mt-2 w-full" size="sm">
                    <Link href="/portal/billing">Open billing</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No invoices yet. Your 3PL will bill per contract.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low stock + shipments */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-amber-500/20 bg-amber-500/[0.04] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangleIcon className="size-4 text-amber-600" />
                Inventory alerts
              </CardTitle>
              <CardDescription>
                SKUs below your configured low-stock threshold
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboardQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : data?.lowStockItems.length ? (
                data.lowStockItems.map((item) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-background/80 px-3 py-2.5"
                    key={item.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku}
                      </p>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {item.quantity}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        / {item.threshold}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  All tracked SKUs are above threshold — great job.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent shipments</CardTitle>
              <CardDescription>
                Latest outbound activity from your 3PL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              {dashboardQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : data?.recentShipments.length ? (
                <ul className="space-y-0">
                  {data.recentShipments.map((shipment, index) => (
                    <li
                      className={cn(
                        "flex items-start gap-3 py-3",
                        index > 0 && "border-t border-border/60",
                      )}
                      key={shipment.id}
                    >
                      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#3874ff]/10">
                        <TruckIcon className="size-4 text-[#3874ff]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {shipment.order.channelOrderId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {shipment.carrier} ·{" "}
                          {new Date(shipment.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          shipmentStatusTone(shipment.status),
                        )}
                      >
                        {shipment.status.replaceAll("_", " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shipments yet — orders will appear here once fulfilled.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <DashboardFeatureGrid
          columns={3}
          description="Everything in your merchant portal — billing, team, integrations, and AI."
          links={[...PORTAL_FEATURES]}
          title="Portal features"
        />
      </div>
    </div>
  );
}

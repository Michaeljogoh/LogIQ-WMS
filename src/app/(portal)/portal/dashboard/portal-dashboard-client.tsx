"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  BotIcon,
  CreditCardIcon,
  PackageIcon,
  PlugIcon,
  TrendingUpIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { DashboardLineChart } from "@/components/charts/dashboard-line-chart";
import { DashboardPieChart } from "@/components/charts/dashboard-pie-chart";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { DashboardFeatureGrid } from "@/components/dashboard/dashboard-feature-grid";
import {
  SettingsListItem,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
    icon: WarehouseIcon,
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
    <SettingsPage>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/portal/chat">
                <BotIcon className="size-4" aria-hidden />
                Ask LogIQ
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/billing">View billing</Link>
            </Button>
          </div>
        }
        description={
          data?.integration
            ? `Connected to ${formatIntegrationType(data.integration.type)}${
                data.integration.shopDomain
                  ? ` · ${data.integration.shopDomain}`
                  : ""
              } · last ${data.periodDays ?? 14} days`
            : "Track fulfillment, inventory, and billing with your 3PL partner."
        }
        title={
          dashboardQuery.isLoading
            ? "Merchant dashboard"
            : `Welcome back, ${data?.merchantName ?? "Brand"}`
        }
      />

      {data?.integration ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1" variant="info">
            <PlugIcon className="size-3" aria-hidden />
            {formatIntegrationType(data.integration.type)}
          </Badge>
          <Badge
            variant={
              data.integration.status === "CONNECTED" ? "success" : "warning"
            }
          >
            {data.integration.status.toLowerCase()}
          </Badge>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiStatCard
          accent="navy-blue"
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
          accent="navy-teal"
          hint={`${shipmentTotal14d} in last 14 days`}
          icon={TruckIcon}
          isLoading={dashboardQuery.isLoading}
          label="Recent shipments"
          value={data?.recentShipments.length ?? 0}
        />
        <KpiStatCard
          accent="navy-violet"
          hint={`${data?.totalSkus ?? 0} active SKUs`}
          icon={WarehouseIcon}
          isLoading={dashboardQuery.isLoading}
          label="Units on hand"
          value={(data?.unitsOnHand ?? 0).toLocaleString()}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SettingsPanel className="lg:col-span-2">
          <SettingsPanelHeader
            description="Orders placed vs fulfilled per day"
            title="Order activity"
          />
          <SettingsPanelBody className="h-72">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : orderTrendEmpty ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No order activity in this period
              </div>
            ) : (
              <DashboardLineChart
                data={data?.orderTrend ?? []}
                series={[
                  { dataKey: "orders", name: "Orders", color: "#3874ff" },
                  { dataKey: "shipped", name: "Fulfilled", color: "#00c896" },
                ]}
                xKey="date"
              />
            )}
          </SettingsPanelBody>
        </SettingsPanel>

        <SettingsPanel>
          <SettingsPanelHeader
            description="Open orders by fulfillment status"
            title="Open order mix"
          />
          <SettingsPanelBody className="h-72">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : !data?.statusMix.length ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No open orders to chart
              </div>
            ) : (
              <DashboardPieChart data={data.statusMix} />
            )}
          </SettingsPanelBody>
        </SettingsPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SettingsPanel className="lg:col-span-2">
          <SettingsPanelHeader
            description="Outbound labels created per day"
            title="Shipment trend"
          />
          <SettingsPanelBody className="h-72">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : data?.shipmentTrend.every((d) => d.shipments === 0) ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No shipments in this period
              </div>
            ) : (
              <DashboardLineChart
                data={data?.shipmentTrend ?? []}
                series={[
                  { dataKey: "shipments", name: "Shipments", color: "#1a4fd6" },
                ]}
                xKey="date"
              />
            )}
          </SettingsPanelBody>
        </SettingsPanel>

        <SettingsPanel>
          <SettingsPanelHeader
            description="Most recent billing period"
            icon={CreditCardIcon}
            title="Latest invoice"
          />
          <SettingsPanelBody>
            {dashboardQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : data?.latestInvoice ? (
              <div className="space-y-4">
                <p className="text-3xl font-bold tabular-nums tracking-tight">
                  {formatCents(data.latestInvoice.totalCents)}
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    {data.latestInvoice.invoiceNumber}
                  </p>
                  <StatusBadge status={data.latestInvoice.status} />
                </div>
                <Button asChild className="w-full" size="sm">
                  <Link href="/portal/billing">Open billing</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No invoices yet. Your 3PL will bill per contract.
              </p>
            )}
          </SettingsPanelBody>
        </SettingsPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsPanel>
          <SettingsPanelHeader
            description="SKUs below your configured low-stock threshold"
            icon={AlertTriangleIcon}
            title="Inventory alerts"
          />
          <SettingsPanelBody className="space-y-2">
            {dashboardQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : data?.lowStockItems.length ? (
              data.lowStockItems.map((item) => (
                <SettingsListItem key={item.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <span className="font-bold text-warning">{item.quantity}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {item.threshold}
                    </span>
                  </div>
                </SettingsListItem>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                All tracked SKUs are above threshold.
              </p>
            )}
          </SettingsPanelBody>
        </SettingsPanel>

        <SettingsPanel>
          <SettingsPanelHeader
            description="Latest outbound activity from your 3PL"
            icon={TruckIcon}
            title="Recent shipments"
          />
          <SettingsPanelBody className="space-y-0 divide-y divide-border/60">
            {dashboardQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : data?.recentShipments.length ? (
              data.recentShipments.map((shipment) => (
                <SettingsListItem
                  className="rounded-none border-0 px-0 shadow-none"
                  key={shipment.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {shipment.order.channelOrderId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shipment.carrier} ·{" "}
                      {new Date(shipment.createdAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </SettingsListItem>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No shipments yet. Orders appear here once fulfilled.
              </p>
            )}
          </SettingsPanelBody>
        </SettingsPanel>
      </div>

      <DashboardFeatureGrid
        columns={3}
        description="Billing, team, integrations, and AI chat in your merchant portal."
        links={[...PORTAL_FEATURES]}
        title="Portal modules"
      />
    </SettingsPage>
  );
}

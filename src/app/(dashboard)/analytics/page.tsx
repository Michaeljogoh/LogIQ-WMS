"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarRange,
  Clock,
  LineChart as LineChartIcon,
  Package,
  PackageCheck,
  SlidersHorizontal,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

function downloadTextFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadBinaryFile(
  filename: string,
  mimeType: string,
  bytes: Uint8Array,
) {
  const normalized = new Uint8Array(bytes.byteLength);
  normalized.set(bytes);
  const blob = new Blob([normalized], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function base64ToUint8Array(base64: string) {
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

export default function Page() {
  const trpc = useTRPC();
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState("operations");
  const [dimensions, setDimensions] = useState<
    Array<"DAY" | "MERCHANT" | "CARRIER" | "WAREHOUSE">
  >(["DAY", "MERCHANT"]);
  const [metrics, setMetrics] = useState<
    Array<
      | "ORDER_COUNT"
      | "UNITS_SHIPPED"
      | "BILLED_CENTS"
      | "SHIPMENT_COST_CENTS"
      | "RECEIVED_UNITS"
    >
  >(["ORDER_COUNT", "BILLED_CENTS"]);

  const operationsQuery = useQuery(
    trpc.analytics.operationsDashboard.queryOptions(),
  );
  const inventoryQuery = useQuery(
    trpc.analytics.inventoryHealth.queryOptions(),
  );
  const merchantPerformanceQuery = useQuery(
    trpc.analytics.merchantPerformance.queryOptions({
      from: new Date(from),
      to: new Date(to),
    }),
  );
  const carrierQuery = useQuery(
    trpc.analytics.carrierCost.queryOptions({
      from: new Date(from),
      to: new Date(to),
    }),
  );
  const receivingQuery = useQuery(
    trpc.analytics.receivingReport.queryOptions({
      from: new Date(from),
      to: new Date(to),
    }),
  );
  const forecastQuery = useQuery(
    trpc.analytics.capacityForecast.queryOptions({}),
  );
  const customReportQuery = useQuery(
    trpc.analytics.customReport.queryOptions({
      from: new Date(from),
      to: new Date(to),
      dimensions,
      metrics,
    }),
  );
  const customExport = useMutation(
    trpc.analytics.customReportExport.mutationOptions({
      onSuccess: (payload) => {
        downloadTextFile(
          payload.csvFileName,
          "text/csv;charset=utf-8",
          payload.csv,
        );
        const pdfBytes = base64ToUint8Array(payload.pdfBase64);
        downloadBinaryFile(payload.pdfFileName, "application/pdf", pdfBytes);
      },
    }),
  );

  const chartMetric =
    metrics.find(
      (metric) => customReportQuery.data?.rows[0]?.[metric] !== undefined,
    ) ?? metrics[0];

  const customChartRows = useMemo(() => {
    if (!customReportQuery.data?.rows?.length) {
      return [];
    }
    return customReportQuery.data.rows.map((row) => ({
      label:
        (typeof row.DAY === "string" ? row.DAY : undefined) ??
        (typeof row.MERCHANT === "string" ? row.MERCHANT : undefined) ??
        "row",
      value: Number(row[chartMetric] ?? 0),
    }));
  }, [customReportQuery.data?.rows, chartMetric]);

  const showDateRange = ["merchant", "carrier", "receiving", "custom"].includes(
    activeTab,
  );

  return (
    <SettingsPage>
      <PageHeader
        description="Operations, inventory, carrier, receiving, and custom reporting across your network."
        title="Analytics"
      />

      <Tabs
        className="analytics-report-tabs space-y-6"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <TabsList
            aria-label="Analytics reports"
            className="h-auto w-full flex-wrap justify-start gap-2 xl:flex-1"
          >
          <TabsTrigger
            className="analytics-tab analytics-tab--operations"
            value="operations"
          >
            <BarChart3 aria-hidden />
            Operations
          </TabsTrigger>
          <TabsTrigger
            className="analytics-tab analytics-tab--inventory"
            value="inventory"
          >
            <Package aria-hidden />
            Inventory Health
          </TabsTrigger>
          <TabsTrigger
            className="analytics-tab analytics-tab--merchant"
            value="merchant"
          >
            <Store aria-hidden />
            Merchant Performance
          </TabsTrigger>
          <TabsTrigger
            className="analytics-tab analytics-tab--carrier"
            value="carrier"
          >
            <Truck aria-hidden />
            Carrier Cost
          </TabsTrigger>
          <TabsTrigger
            className="analytics-tab analytics-tab--receiving"
            value="receiving"
          >
            <PackageCheck aria-hidden />
            Receiving Report
          </TabsTrigger>
          <TabsTrigger
            className="analytics-tab analytics-tab--forecast"
            value="forecast"
          >
            <LineChartIcon aria-hidden />
            Capacity Forecast
          </TabsTrigger>
          <TabsTrigger
            className="analytics-tab analytics-tab--custom"
            value="custom"
          >
            <SlidersHorizontal aria-hidden />
            Custom Report
          </TabsTrigger>
          </TabsList>

          {showDateRange ? (
            <div className="analytics-date-range flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
              <CalendarRange
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="From date"
                className="h-9 w-36 bg-background"
                onChange={(event) => setFrom(event.target.value)}
                type="date"
                value={from}
              />
              <span className="text-xs font-medium text-muted-foreground">
                to
              </span>
              <Input
                aria-label="To date"
                className="h-9 w-36 bg-background"
                onChange={(event) => setTo(event.target.value)}
                type="date"
                value={to}
              />
            </div>
          ) : null}
        </div>

        <TabsContent className="space-y-4" value="operations">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiStatCard
              accent="navy-blue"
              hint="Orders created today"
              icon={Package}
              isLoading={operationsQuery.isLoading}
              label="Orders today"
              value={operationsQuery.data?.ordersToday ?? 0}
            />
            <KpiStatCard
              accent="success"
              hint="Shipped vs total"
              icon={TrendingUp}
              isLoading={operationsQuery.isLoading}
              label="Fulfillment rate"
              value={`${operationsQuery.data?.fulfillmentRatePct ?? 0}%`}
            />
            <KpiStatCard
              accent="navy-teal"
              hint="Average pick duration"
              icon={Clock}
              isLoading={operationsQuery.isLoading}
              label="Avg pick time"
              value={`${operationsQuery.data?.avgPickTimeMins ?? 0}m`}
            />
            <KpiStatCard
              accent="navy-violet"
              hint="Last 7 days"
              icon={BarChart3}
              isLoading={operationsQuery.isLoading}
              label="SLA compliance"
              value={`${operationsQuery.data?.slaCompliancePct7d ?? 0}%`}
            />
            <KpiStatCard
              accent="warning"
              hint="Awaiting fulfillment"
              icon={Package}
              isLoading={operationsQuery.isLoading}
              label="Pending orders"
              value={operationsQuery.data?.pendingOrders ?? 0}
            />
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="inventory">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiStatCard
              accent="navy-blue"
              isLoading={inventoryQuery.isLoading}
              label="Total SKUs"
              value={inventoryQuery.data?.totalSkus ?? 0}
            />
            <KpiStatCard
              accent="success"
              isLoading={inventoryQuery.isLoading}
              label="Total units"
              value={inventoryQuery.data?.totalUnits ?? 0}
            />
            <KpiStatCard
              accent="navy-violet"
              isLoading={inventoryQuery.isLoading}
              label="Inventory value"
              value={formatCents(inventoryQuery.data?.inventoryValueCents ?? 0)}
            />
            <KpiStatCard
              accent="warning"
              isLoading={inventoryQuery.isLoading}
              label="Low stock"
              value={inventoryQuery.data?.lowStockCount ?? 0}
            />
            <KpiStatCard
              accent={
                (inventoryQuery.data?.deadStockCount ?? 0) > 0
                  ? "warning"
                  : "navy-teal"
              }
              isLoading={inventoryQuery.isLoading}
              label="Dead stock"
              value={inventoryQuery.data?.deadStockCount ?? 0}
            />
          </div>
          <SettingsPanel className="mt-4">
            <SettingsPanelHeader title="Top 10 movers (30d)" />
            <SettingsPanelBody className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryQuery.data?.top10Movers ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sku" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="movedUnits" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </SettingsPanelBody>
          </SettingsPanel>
        </TabsContent>

        <TabsContent className="space-y-4" value="merchant">
          <SettingsPanel>
            <SettingsPanelHeader
              icon={TrendingUp}
              title="Merchant performance"
            />
            <SettingsPanelBody>
              <SettingsTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Units Shipped</TableHead>
                    <TableHead>Billed</TableHead>
                    <TableHead>SLA %</TableHead>
                    <TableHead>Breach Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchantPerformanceQuery.data?.map((row) => (
                    <TableRow className="logiq-table-row" key={row.merchantId}>
                      <TableCell>{row.merchantName}</TableCell>
                      <TableCell>{row.orderCount}</TableCell>
                      <TableCell>{row.unitsShipped}</TableCell>
                      <TableCell>{formatCents(row.billedCents)}</TableCell>
                      <TableCell>{row.slaPct}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.breachCount > 0 ? "destructive" : "secondary"
                          }
                        >
                          {row.breachCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </SettingsTableWrap>
            </SettingsPanelBody>
          </SettingsPanel>
        </TabsContent>

        <TabsContent className="space-y-4" value="carrier">
          <SettingsPanel>
            <SettingsPanelHeader icon={Truck} title="Carrier cost analysis" />
            <SettingsPanelBody>
              <SettingsTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Shipments</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Avg Cost</TableHead>
                    <TableHead>On-time %</TableHead>
                    <TableHead>Damage %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carrierQuery.data?.map((row) => (
                    <TableRow className="logiq-table-row" key={row.carrier}>
                      <TableCell>{row.carrier}</TableCell>
                      <TableCell>{row.shipmentCount}</TableCell>
                      <TableCell>{formatCents(row.totalCostCents)}</TableCell>
                      <TableCell>{formatCents(row.avgCostCents)}</TableCell>
                      <TableCell>{row.onTimeRatePct}%</TableCell>
                      <TableCell>{row.damageRatePct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </SettingsTableWrap>
            </SettingsPanelBody>
          </SettingsPanel>
        </TabsContent>

        <TabsContent className="space-y-4" value="receiving">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiStatCard
              accent="success"
              isLoading={receivingQuery.isLoading}
              label="Units received"
              value={receivingQuery.data?.totalUnitsReceived ?? 0}
            />
            <KpiStatCard
              accent="navy-blue"
              isLoading={receivingQuery.isLoading}
              label="PO count"
              value={receivingQuery.data?.uniquePoCount ?? 0}
            />
            <KpiStatCard
              accent="navy-teal"
              isLoading={receivingQuery.isLoading}
              label="On-time rate"
              value={`${receivingQuery.data?.onTimeRatePct ?? 0}%`}
            />
          </div>
          <SettingsPanel className="mt-4">
            <SettingsPanelHeader title="Receiving lines" />
            <SettingsPanelBody>
              <SettingsTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Received At</TableHead>
                    <TableHead>Discrepancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivingQuery.data?.rows.map((row) => (
                    <TableRow className="logiq-table-row" key={row.id}>
                      <TableCell>{row.poNumber}</TableCell>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell>{row.receivedQty}</TableCell>
                      <TableCell>
                        {new Date(row.receivedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{row.discrepancyNote || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </SettingsTableWrap>
            </SettingsPanelBody>
          </SettingsPanel>
        </TabsContent>

        <TabsContent className="space-y-4" value="forecast">
          <SettingsPanel>
            <SettingsPanelHeader title="7-day capacity forecast" />
            <SettingsPanelBody className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastQuery.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="predictedOrders"
                    stroke="#2563eb"
                  />
                  <Line type="monotone" dataKey="lowerBound" stroke="#16a34a" />
                  <Line type="monotone" dataKey="upperBound" stroke="#dc2626" />
                </LineChart>
              </ResponsiveContainer>
            </SettingsPanelBody>
          </SettingsPanel>
          <SettingsPanel className="mt-4">
            <SettingsPanelHeader title="Recommended staffing" />
            <SettingsPanelBody>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {forecastQuery.data?.map((row) => (
                  <article className="logiq-capacity-day-card" key={row.date}>
                    <header className="logiq-capacity-day-card__header">
                      <time
                        className="logiq-capacity-day-card__date"
                        dateTime={row.date}
                      >
                        {row.date}
                      </time>
                    </header>
                    <dl className="logiq-capacity-day-card__metrics">
                      <div className="logiq-capacity-day-card__metric">
                        <dt>Predicted orders</dt>
                        <dd className="tabular-nums">{row.predictedOrders}</dd>
                      </div>
                      <div className="logiq-capacity-day-card__metric logiq-capacity-day-card__metric--staff">
                        <dt>Suggested staff</dt>
                        <dd className="tabular-nums">{row.recommendedStaff}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </SettingsPanelBody>
          </SettingsPanel>
        </TabsContent>

        <TabsContent className="space-y-4" value="custom">
          <SettingsPanel>
            <SettingsPanelHeader title="Custom report builder" />
            <SettingsPanelBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["DAY", "MERCHANT", "CARRIER", "WAREHOUSE"] as const).map(
                  (dimension) => (
                    <Button
                      key={dimension}
                      variant={
                        dimensions.includes(dimension) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setDimensions((prev) =>
                          prev.includes(dimension)
                            ? prev.filter((item) => item !== dimension)
                            : [...prev, dimension],
                        )
                      }
                    >
                      {dimension}
                    </Button>
                  ),
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "ORDER_COUNT",
                    "UNITS_SHIPPED",
                    "BILLED_CENTS",
                    "SHIPMENT_COST_CENTS",
                    "RECEIVED_UNITS",
                  ] as const
                ).map((metric) => (
                  <Button
                    key={metric}
                    variant={metrics.includes(metric) ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setMetrics((prev) =>
                        prev.includes(metric)
                          ? prev.filter((item) => item !== metric)
                          : [...prev, metric],
                      )
                    }
                  >
                    {metric}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={
                    customExport.isPending ||
                    !customReportQuery.data?.rows.length
                  }
                  onClick={() =>
                    customExport.mutate({
                      title: "Custom Analytics Report",
                      rows: customReportQuery.data?.rows ?? [],
                    })
                  }
                >
                  Export CSV + PDF
                </Button>
              </div>
            </SettingsPanelBody>
          </SettingsPanel>

          <SettingsPanel className="mt-4">
            <SettingsPanelHeader title="Custom chart" />
            <SettingsPanelBody className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {customReportQuery.data?.chartType === "line" ? (
                  <LineChart data={customChartRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" />
                  </LineChart>
                ) : (
                  <BarChart data={customChartRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </SettingsPanelBody>
          </SettingsPanel>

          <SettingsPanel className="mt-4">
            <SettingsPanelHeader title="Custom report table" />
            <SettingsPanelBody>
              <SettingsTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    {(customReportQuery.data?.rows[0]
                      ? Object.keys(customReportQuery.data.rows[0])
                      : []
                    ).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customReportQuery.data?.rows.map((row) => (
                    <TableRow key={JSON.stringify(row)}>
                      {Object.keys(row).map((key) => (
                        <TableCell key={`${JSON.stringify(row)}-${key}`}>
                          {String(row[key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </SettingsTableWrap>
            </SettingsPanelBody>
          </SettingsPanel>
        </TabsContent>
      </Tabs>
    </SettingsPage>
  );
}

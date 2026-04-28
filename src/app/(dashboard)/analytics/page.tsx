"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">From</p>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">To</p>
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Health</TabsTrigger>
          <TabsTrigger value="merchant">Merchant Performance</TabsTrigger>
          <TabsTrigger value="carrier">Carrier Cost</TabsTrigger>
          <TabsTrigger value="receiving">Receiving Report</TabsTrigger>
          <TabsTrigger value="forecast">Capacity Forecast</TabsTrigger>
          <TabsTrigger value="custom">Custom Report</TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Orders Today</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {operationsQuery.data?.ordersToday ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fulfillment Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {operationsQuery.data?.fulfillmentRatePct ?? 0}%
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Pick Time</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {operationsQuery.data?.avgPickTimeMins ?? 0}m
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SLA Compliance (7d)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {operationsQuery.data?.slaCompliancePct7d ?? 0}%
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pending Orders</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {operationsQuery.data?.pendingOrders ?? 0}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total SKUs</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {inventoryQuery.data?.totalSkus ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Units</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {inventoryQuery.data?.totalUnits ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCents(inventoryQuery.data?.inventoryValueCents ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Count</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {inventoryQuery.data?.lowStockCount ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Dead Stock Count</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {inventoryQuery.data?.deadStockCount ?? 0}
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Top 10 Movers (30d)</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryQuery.data?.top10Movers ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sku" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="movedUnits" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="merchant">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Performance</CardTitle>
            </CardHeader>
            <CardContent>
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
                    <TableRow key={row.merchantId}>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carrier">
          <Card>
            <CardHeader>
              <CardTitle>Carrier Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
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
                    <TableRow key={row.carrier}>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receiving">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Units Received</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {receivingQuery.data?.totalUnitsReceived ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>PO Count</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {receivingQuery.data?.uniquePoCount ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>On-time Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {receivingQuery.data?.onTimeRatePct ?? 0}%
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Receiving Lines</CardTitle>
            </CardHeader>
            <CardContent>
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
                    <TableRow key={row.id}>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>7-Day Capacity Forecast</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
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
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recommended Staffing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                {forecastQuery.data?.map((row) => (
                  <div key={row.date} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{row.date}</p>
                    <p className="text-xs text-muted-foreground">
                      Predicted: {row.predictedOrders}
                    </p>
                    <p className="text-lg font-semibold">
                      {row.recommendedStaff} staff
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Custom Chart</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
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
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Custom Report Table</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

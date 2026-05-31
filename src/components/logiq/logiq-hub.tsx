"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { useTRPC } from "@/app/trpc/client";
import { useOperatorRole } from "@/hooks/use-operator-role";
import { CapacityForecastChart } from "@/components/logiq/capacity-forecast-chart";
import { CarrierScorecardTable } from "@/components/logiq/carrier-scorecard-table";
import { InsightFeed } from "@/components/logiq/insight-feed";
import { StockForecastTable } from "@/components/logiq/stock-forecast-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUGGESTIONS = [
  "Which merchant had the most orders last week?",
  "Show SKUs with fewer than 10 units in stock",
  "How many shipments were created this month?",
];

export function LogiqHub() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>("");

  const { isAccountOwner: canRunJobs } = useOperatorRole();

  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const insightsQuery = useQuery(trpc.logiq.getInsights.queryOptions({}));
  const stockForecastQuery = useQuery(
    trpc.logiq.getStockForecast.queryOptions({}),
  );
  const scorecardsQuery = useQuery(
    trpc.logiq.getCarrierScorecards.queryOptions({}),
  );

  const warehouses = warehousesQuery.data ?? [];
  const firstWh = warehouses[0]?.id ?? "";
  const effectiveWh = warehouseId || firstWh;

  const capacityQuery = useQuery({
    ...trpc.logiq.getCapacityForecast.queryOptions({
      warehouseId: effectiveWh,
    }),
    enabled: Boolean(effectiveWh),
  });

  const queryMut = useMutation(
    trpc.logiq.query.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries(trpc.logiq.getInsights.queryFilter());
      },
    }),
  );

  const runJobsMut = useMutation(
    trpc.logiq.runJobs.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          qc.invalidateQueries(trpc.logiq.getInsights.queryFilter()),
          qc.invalidateQueries(trpc.logiq.getStockForecast.queryFilter()),
          qc.invalidateQueries(trpc.logiq.getCarrierScorecards.queryFilter()),
          qc.invalidateQueries(
            trpc.logiq.getCapacityForecast.queryFilter({
              warehouseId: effectiveWh,
            }),
          ),
        ]);
      },
    }),
  );

  const chartData = useMemo(() => {
    const rows = queryMut.data?.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    return rows.map((row, i) => {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        return { ...(row as Record<string, unknown>), __i: i };
      }
      return { value: row, __i: i };
    });
  }, [queryMut.data?.data]);

  const chartKeys = useMemo(() => {
    const row = chartData[0];
    if (!row || typeof row !== "object") {
      return [];
    }
    return Object.keys(row).filter((k) => k !== "__i");
  }, [chartData]);

  const firstChartRow = chartData[0] as Record<string, unknown> | undefined;
  const numericKeys = chartKeys.filter(
    (k) => typeof firstChartRow?.[k] === "number",
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">LogIQ</h1>
          <p className="text-sm text-muted-foreground">
            Natural language queries, operational insights, carrier scorecards,
            and capacity forecasts.
          </p>
        </div>
        {canRunJobs ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 shrink-0"
            disabled={runJobsMut.isPending}
            onClick={() =>
              runJobsMut.mutate({
                jobs: [
                  "stockout",
                  "overstock",
                  "carrierScorecard",
                  "capacity",
                  "pickRate",
                ],
              })
            }
          >
            {runJobsMut.isPending ? "Running…" : "Run intelligence scans"}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ask LogIQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-11 whitespace-normal py-2 text-left text-xs"
                onClick={() => setQ(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question about your operations…"
              className="min-h-11"
            />
            <Button
              type="button"
              className="min-h-11"
              disabled={!q.trim() || queryMut.isPending}
              onClick={() => queryMut.mutate({ text: q.trim() })}
            >
              {queryMut.isPending ? "Thinking…" : "Run query"}
            </Button>
          </div>
          {queryMut.data?.explanation ? (
            <p className="text-sm text-muted-foreground">
              {queryMut.data.explanation}
            </p>
          ) : null}
          {queryMut.error ? (
            <p className="text-sm text-destructive">{queryMut.error.message}</p>
          ) : null}

          {chartData.length > 0 &&
          queryMut.data?.chartType === "bar" &&
          numericKeys[0] ? (
            <ChartContainer
              config={{
                a: { label: numericKeys[0], color: "var(--chart-1)" },
              }}
              className="h-64 w-full"
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chartKeys[0]} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey={numericKeys[0]}
                  fill="var(--color-a)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          ) : null}

          {chartData.length > 0 &&
          queryMut.data?.chartType === "line" &&
          numericKeys[0] ? (
            <ChartContainer
              config={{
                a: { label: numericKeys[0], color: "var(--chart-1)" },
              }}
              className="h-64 w-full"
            >
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chartKeys[0]} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey={numericKeys[0]}
                  stroke="var(--color-a)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          ) : null}

          {chartData.length > 0 &&
          (!queryMut.data?.chartType || queryMut.data.chartType === "table") ? (
            <div className="overflow-x-auto rounded-md border text-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {chartKeys.map((k) => (
                      <th key={k} className="px-3 py-2 text-left font-medium">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={String(row.__i)} className="border-b">
                      {chartKeys.map((k) => (
                        <td key={k} className="px-3 py-2">
                          {String((row as Record<string, unknown>)[k] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <InsightFeed
          items={insightsQuery.data?.items ?? []}
          isLoading={insightsQuery.isLoading}
        />
        <StockForecastTable
          rows={stockForecastQuery.data ?? []}
          isLoading={stockForecastQuery.isLoading}
        />
      </div>

      <CarrierScorecardTable
        rows={scorecardsQuery.data ?? []}
        isLoading={scorecardsQuery.isLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle>Capacity forecast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex max-w-sm flex-col gap-2">
            <Label>Warehouse</Label>
            <Select
              value={effectiveWh || undefined}
              onValueChange={(v) => setWarehouseId(v)}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CapacityForecastChart
            data={capacityQuery.data ?? null}
            isLoading={capacityQuery.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

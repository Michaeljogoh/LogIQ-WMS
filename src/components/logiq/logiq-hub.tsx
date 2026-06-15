"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Lightbulb, Sparkles, TrendingUp, Warehouse } from "lucide-react";
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
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { CapacityForecastChart } from "@/components/logiq/capacity-forecast-chart";
import { CarrierScorecardTable } from "@/components/logiq/carrier-scorecard-table";
import { InsightFeed } from "@/components/logiq/insight-feed";
import { StockForecastTable } from "@/components/logiq/stock-forecast-table";
import {
  SettingsFilterBar,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
import { useOperatorRole } from "@/hooks/use-operator-role";

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

  const insightCount = insightsQuery.data?.items.length ?? 0;
  const stockForecastRows = (stockForecastQuery.data ?? []) as Array<{
    stockoutRisk: number;
  }>;
  const stockAlertCount = stockForecastRows.reduce(
    (count, row) => count + (row.stockoutRisk >= 0.33 ? 1 : 0),
    0,
  );
  const carrierCount = scorecardsQuery.data?.length ?? 0;

  return (
    <SettingsPage>
      <PageHeader
        actions={
          canRunJobs ? (
            <Button
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
              type="button"
              variant="secondary"
            >
              {runJobsMut.isPending ? "Running…" : "Run intelligence scans"}
            </Button>
          ) : undefined
        }
        description="Natural language queries, operational insights, carrier scorecards, and capacity forecasts."
        title="LogIQ"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="AI-generated recommendations"
          icon={Lightbulb}
          isLoading={insightsQuery.isLoading}
          label="Active insights"
          value={insightCount}
        />
        <KpiStatCard
          accent={stockAlertCount > 0 ? "warning" : "success"}
          hint="Stockout risk within 14 days"
          icon={TrendingUp}
          isLoading={stockForecastQuery.isLoading}
          label="Stock alerts"
          value={stockAlertCount}
        />
        <KpiStatCard
          accent="navy-violet"
          hint="Carrier performance rows"
          icon={Sparkles}
          isLoading={scorecardsQuery.isLoading}
          label="Carrier scorecards"
          value={carrierCount}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Capacity forecast sites"
          icon={Warehouse}
          isLoading={warehousesQuery.isLoading}
          label="Warehouses"
          value={warehouses.length}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Ask questions in plain language about orders, inventory, and shipments."
          icon={Bot}
          title="Ask LogIQ"
        />
        <SettingsPanelBody className="space-y-4">
          <SettingsFilterBar>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  className="h-auto min-h-11 whitespace-normal py-2 text-left text-xs"
                  key={s}
                  onClick={() => setQ(s)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {s}
                </Button>
              ))}
            </div>
          </SettingsFilterBar>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="min-h-11"
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question about your operations…"
              value={q}
            />
            <Button
              className="min-h-11"
              disabled={!q.trim() || queryMut.isPending}
              onClick={() => queryMut.mutate({ text: q.trim() })}
              type="button"
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
              className="h-64 w-full"
              config={{
                a: { label: numericKeys[0], color: "var(--chart-1)" },
              }}
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
              className="h-64 w-full"
              config={{
                a: { label: numericKeys[0], color: "var(--chart-1)" },
              }}
            >
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chartKeys[0]} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey={numericKeys[0]}
                  dot={false}
                  stroke="var(--color-a)"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ChartContainer>
          ) : null}

          {chartData.length > 0 &&
          (!queryMut.data?.chartType || queryMut.data.chartType === "table") ? (
            <div className="settings-table-wrap overflow-x-auto text-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {chartKeys.map((k) => (
                      <th className="px-3 py-2 text-left font-medium" key={k}>
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr className="border-b" key={String(row.__i)}>
                      {chartKeys.map((k) => (
                        <td className="px-3 py-2" key={k}>
                          {String((row as Record<string, unknown>)[k] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </SettingsPanelBody>
      </SettingsPanel>

      <InsightFeed
        isLoading={insightsQuery.isLoading}
        items={insightsQuery.data?.items ?? []}
      />

      <StockForecastTable
        isLoading={stockForecastQuery.isLoading}
        rows={stockForecastQuery.data ?? []}
      />

      <CarrierScorecardTable
        isLoading={scorecardsQuery.isLoading}
        rows={scorecardsQuery.data ?? []}
      />

      <SettingsPanel>
        <SettingsPanelHeader
          description="Predicted order volume and recommended staffing by warehouse."
          icon={Warehouse}
          title="Capacity forecast"
        />
        <SettingsPanelBody className="space-y-4">
          <div className="flex max-w-sm flex-col gap-2">
            <Label>Warehouse</Label>
            <Select
              onValueChange={(v) => setWarehouseId(v)}
              value={effectiveWh || undefined}
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
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

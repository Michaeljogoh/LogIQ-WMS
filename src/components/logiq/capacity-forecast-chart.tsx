"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type CapacityForecastChartData = {
  warehouseId: string;
  warehouseName: string;
  historicalPeak: number;
  generatedAt: string;
  days: Array<{
    date: string;
    predicted: number;
    low: number;
    high: number;
    recommendedStaff: number;
  }>;
};

export function CapacityForecastChart(props: {
  data: CapacityForecastChartData | null;
  isLoading: boolean;
}) {
  if (props.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading forecast…</p>;
  }
  if (!props.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a warehouse to load the forecast (runs nightly or trigger from
        jobs).
      </p>
    );
  }

  const chartRows = props.data.days.map((d) => ({
    date: d.date,
    predicted: d.predicted,
    low: d.low,
    high: d.high,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ChartContainer
          config={{
            predicted: { label: "Predicted orders", color: "var(--chart-1)" },
            low: { label: "Low", color: "var(--chart-2)" },
            high: { label: "High", color: "var(--chart-3)" },
          }}
          className="h-72 w-full"
        >
          <LineChart data={chartRows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="low"
              stroke="var(--color-low)"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke="var(--color-high)"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="var(--color-predicted)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {props.data.warehouseName} · historical peak{" "}
          {props.data.historicalPeak} orders/day
        </p>
        {props.data.days.map((d) => (
          <Card key={d.date}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">{d.date}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>
                Predicted:{" "}
                <span className="font-medium text-foreground">
                  {d.predicted}
                </span>
              </p>
              <p>
                Band: {d.low} – {d.high}
              </p>
              <p>
                Suggested staff:{" "}
                <span className="font-medium text-foreground">
                  {d.recommendedStaff}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

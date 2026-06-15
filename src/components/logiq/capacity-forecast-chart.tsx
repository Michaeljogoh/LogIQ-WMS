"use client";

import {
  Activity,
  CalendarDays,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  paginateRows,
  TablePagination,
} from "@/components/shared/table-pagination";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const DAY_PAGE_SIZE = 6;

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

function formatForecastDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function CapacityForecastChart(props: {
  data: CapacityForecastChartData | null;
  isLoading: boolean;
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [props.data?.warehouseId]);

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
    label: formatForecastDate(d.date),
    predicted: d.predicted,
    low: d.low,
    high: d.high,
  }));

  const pageDays = paginateRows(props.data.days, page, DAY_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="logiq-capacity-summary grid gap-3 sm:grid-cols-3">
        <div className="logiq-capacity-stat">
          <p className="logiq-capacity-stat__label">Warehouse</p>
          <p className="logiq-capacity-stat__value">{props.data.warehouseName}</p>
        </div>
        <div className="logiq-capacity-stat">
          <p className="logiq-capacity-stat__label">
            <TrendingUp className="mr-1 inline size-3.5" aria-hidden />
            Historical peak
          </p>
          <p className="logiq-capacity-stat__value tabular-nums">
            {props.data.historicalPeak}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              orders/day
            </span>
          </p>
        </div>
        <div className="logiq-capacity-stat">
          <p className="logiq-capacity-stat__label">
            <Activity className="mr-1 inline size-3.5" aria-hidden />
            Forecast horizon
          </p>
          <p className="logiq-capacity-stat__value tabular-nums">
            {props.data.days.length}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              days
            </span>
          </p>
        </div>
      </div>

      <ChartContainer
        className="h-72 w-full"
        config={{
          predicted: { label: "Predicted orders", color: "var(--chart-1)" },
          low: { label: "Low", color: "var(--chart-2)" },
          high: { label: "High", color: "var(--chart-3)" },
        }}
      >
        <LineChart data={chartRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            dataKey="low"
            dot={false}
            stroke="var(--color-low)"
            strokeDasharray="4 4"
            strokeWidth={1}
            type="monotone"
          />
          <Line
            dataKey="high"
            dot={false}
            stroke="var(--color-high)"
            strokeDasharray="4 4"
            strokeWidth={1}
            type="monotone"
          />
          <Line
            dataKey="predicted"
            dot={false}
            stroke="var(--color-predicted)"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="size-4 text-primary" aria-hidden />
          Daily staffing outlook
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pageDays.map((d) => (
            <article
              className={cn("logiq-capacity-day-card group")}
              key={d.date}
            >
              <header className="logiq-capacity-day-card__header">
                <time className="logiq-capacity-day-card__date" dateTime={d.date}>
                  {formatForecastDate(d.date)}
                </time>
                <span className="logiq-capacity-day-card__iso tabular-nums">
                  {d.date}
                </span>
              </header>
              <dl className="logiq-capacity-day-card__metrics">
                <div className="logiq-capacity-day-card__metric">
                  <dt>Predicted</dt>
                  <dd className="tabular-nums">{d.predicted}</dd>
                </div>
                <div className="logiq-capacity-day-card__metric">
                  <dt>Band</dt>
                  <dd className="tabular-nums">
                    {d.low} – {d.high}
                  </dd>
                </div>
                <div className="logiq-capacity-day-card__metric logiq-capacity-day-card__metric--staff">
                  <dt>
                    <Users className="size-3.5" aria-hidden />
                    Suggested staff
                  </dt>
                  <dd className="tabular-nums">{d.recommendedStaff}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <TablePagination
          className="rounded-xl border border-border/60 bg-muted/20"
          label="Days"
          onPageChange={setPage}
          page={page}
          pageSize={DAY_PAGE_SIZE}
          total={props.data.days.length}
        />
      </div>
    </div>
  );
}

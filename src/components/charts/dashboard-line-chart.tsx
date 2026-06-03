"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_PRIMARY,
  CHART_TOOLTIP_STYLE,
  DASHBOARD_CHART_HEIGHT,
} from "@/components/charts/chart-theme";

export type LineSeriesConfig = {
  dataKey: string;
  name: string;
  color?: string;
};

export function DashboardLineChart(
  props: Readonly<{
    data: Array<Record<string, string | number>>;
    xKey: string;
    series: LineSeriesConfig[];
  }>,
) {
  return (
    <div style={{ height: DASHBOARD_CHART_HEIGHT }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={props.data}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            dataKey={props.xKey}
            tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {props.series.map((s, index) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={
                s.color ??
                CHART_COLORS[index % CHART_COLORS.length] ??
                CHART_PRIMARY
              }
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

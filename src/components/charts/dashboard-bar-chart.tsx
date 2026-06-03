"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_PRIMARY,
  CHART_TOOLTIP_STYLE,
  DASHBOARD_CHART_HEIGHT,
} from "@/components/charts/chart-theme";

export function DashboardBarChart(
  props: Readonly<{
    data: Array<{ name: string; value: number }>;
    dataKey?: string;
    nameKey?: string;
  }>,
) {
  const valueKey = props.dataKey ?? "value";
  const labelKey = props.nameKey ?? "name";

  return (
    <div style={{ height: DASHBOARD_CHART_HEIGHT }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={props.data}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            dataKey={labelKey}
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
          <Bar dataKey={valueKey} fill={CHART_PRIMARY} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

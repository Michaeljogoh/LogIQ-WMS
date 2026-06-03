"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
  DASHBOARD_CHART_HEIGHT,
} from "@/components/charts/chart-theme";

export type PieDatum = { name: string; value: number };

export function DashboardPieChart(
  props: Readonly<{
    data: PieDatum[];
    innerRadius?: number;
  }>,
) {
  const inner = props.innerRadius ?? 52;

  return (
    <div style={{ height: DASHBOARD_CHART_HEIGHT }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={props.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={inner}
            outerRadius={100}
            paddingAngle={2}
          >
            {props.data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 12, color: CHART_AXIS_TICK }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

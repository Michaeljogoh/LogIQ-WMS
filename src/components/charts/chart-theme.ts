/** Phoenix-inspired palette for dashboard charts */
export const CHART_PRIMARY = "#3874ff";
export const CHART_COLORS = [
  "#3874ff",
  "#25b003",
  "#0097eb",
  "#e5780b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f43f5e",
] as const;

export const CHART_GRID_STROKE = "hsl(var(--border) / 0.6)";
export const CHART_AXIS_TICK = "hsl(var(--muted-foreground))";

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "13px",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
} as const;

export const DASHBOARD_CHART_HEIGHT = 300;

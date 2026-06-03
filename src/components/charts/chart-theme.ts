/**
 * Chart palette sourced from the brand design system.
 * Uses CSS custom properties so charts respond to light/dark mode automatically.
 */
export const CHART_PRIMARY = "var(--color-chart-1)";
export const CHART_COLORS = [
  "var(--color-chart-1)", // brand blue
  "var(--color-chart-2)", // success green
  "var(--color-chart-3)", // warning amber
  "var(--color-chart-4)", // info teal
  "var(--color-chart-5)", // purple
] as const;

/** Static fallbacks used when a CSS var can't resolve (e.g. inline SVG) */
export const CHART_COLORS_STATIC = [
  "#3874ff",
  "#22c55e",
  "#f59e0b",
  "#0ea5e9",
  "#8b5cf6",
] as const;

export const CHART_GRID_STROKE = "oklch(0 0 0 / 0.06)";
export const CHART_GRID_STROKE_DARK = "oklch(1 0 0 / 0.08)";
export const CHART_AXIS_TICK = "var(--color-muted-foreground)";

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  color: "var(--color-foreground)",
  fontSize: "12px",
  fontFamily: "var(--font-sans)",
  boxShadow: "0 4px 16px oklch(0 0 0 / 0.12)",
  padding: "10px 14px",
} as const;

export const DASHBOARD_CHART_HEIGHT = 280;

"use client";

import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KPI_GRADIENT: Record<
  NonNullable<
    Parameters<typeof KpiStatCard>[0]["accent"]
  >,
  string
> = {
  primary: "kpi-gradient-primary",
  success: "kpi-gradient-success",
  warning: "kpi-gradient-warning",
  default: "kpi-gradient-violet",
  navy: "kpi-gradient-navy",
  "navy-blue": "kpi-gradient-navy-blue",
  "navy-violet": "kpi-gradient-navy-violet",
  "navy-teal": "kpi-gradient-navy-teal",
};

export function KpiStatCard(
  props: Readonly<{
    label: string;
    value: string | number;
    hint?: string;
    icon?: LucideIcon;
    isLoading?: boolean;
    accent?: "default" | "primary" | "warning" | "success" | "navy" | "navy-blue" | "navy-violet" | "navy-teal";
  }>,
) {
  const Icon = props.icon;
  const accent = props.accent ?? "default";

  return (
    <Card
      className={cn(
        "kpi-stat-card !bg-transparent shadow-none ring-0 hover:shadow-none",
        KPI_GRADIENT[accent],
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide text-white/80">
          {props.label}
        </CardDescription>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-white/80" aria-hidden />
        ) : null}
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl font-bold tabular-nums tracking-tight text-white">
          {props.isLoading ? "—" : props.value}
        </CardTitle>
        {props.hint ? (
          <p className="mt-1 text-xs text-white/70">{props.hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

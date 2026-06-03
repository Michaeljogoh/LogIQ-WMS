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

export function KpiStatCard(
  props: Readonly<{
    label: string;
    value: string | number;
    hint?: string;
    icon?: LucideIcon;
    isLoading?: boolean;
    accent?: "default" | "primary" | "warning" | "success";
  }>,
) {
  const Icon = props.icon;
  const accentClass =
    props.accent === "primary"
      ? "text-[#3874ff]"
      : props.accent === "warning"
        ? "text-amber-600"
        : props.accent === "success"
          ? "text-emerald-600"
          : "text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {props.label}
        </CardDescription>
        {Icon ? <Icon className={cn("size-4 shrink-0", accentClass)} /> : null}
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight">
          {props.isLoading ? "—" : props.value}
        </CardTitle>
        {props.hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{props.hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

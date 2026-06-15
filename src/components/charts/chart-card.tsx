"use client";

import type { ReactNode } from "react";
import { DASHBOARD_CHART_HEIGHT } from "@/components/charts/chart-theme";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ChartCard(
  props: Readonly<{
    title: string;
    description?: string;
    isLoading?: boolean;
    isEmpty?: boolean;
    emptyMessage?: string;
    children: ReactNode;
    className?: string;
  }>,
) {
  return (
    <Card
      className={cn(
        "dashboard-chart-card dashboard-surface dashboard-surface-hover ring-0",
        props.className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">{props.title}</CardTitle>
        {props.description ? (
          <CardDescription>{props.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {props.isLoading ? (
          <Skeleton
            className="w-full rounded-lg"
            style={{ height: DASHBOARD_CHART_HEIGHT }}
          />
        ) : props.isEmpty ? (
          <div
            className="flex items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground"
            style={{ height: DASHBOARD_CHART_HEIGHT }}
          >
            {props.emptyMessage ?? "No data for this period"}
          </div>
        ) : (
          props.children
        )}
      </CardContent>
    </Card>
  );
}

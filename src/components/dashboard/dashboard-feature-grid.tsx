"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DashboardFeatureLink = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

export function DashboardFeatureGrid(
  props: Readonly<{
    title?: string;
    description?: string;
    links: DashboardFeatureLink[];
    columns?: 2 | 3 | 4;
    variant?: "default" | "platform";
  }>,
) {
  const cols =
    props.columns === 2
      ? "sm:grid-cols-2"
      : props.columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  const isPlatform = props.variant === "platform";

  return (
    <Card
      className={cn(
        "dashboard-surface dashboard-surface-hover ring-0",
        isPlatform
          ? "platform-modules-shell dashboard-chart-card"
          : "dashboard-chart-card",
      )}
    >
      {props.title ? (
        <CardHeader>
          <CardTitle className="text-base font-bold">{props.title}</CardTitle>
          {props.description ? (
            <CardDescription>{props.description}</CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("grid gap-3", cols, !props.title && "pt-6")}>
        {props.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group flex flex-col p-4 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isPlatform ? "platform-module-card" : "workspace-module-card",
            )}
          >
            <link.icon
              className={cn(
                "platform-module-icon mb-3 size-5 transition-colors duration-200",
                isPlatform ? "text-[#0b213a] dark:text-white/90" : "text-primary",
              )}
              aria-hidden
            />
            <span className="platform-module-title flex items-center gap-2 text-sm font-semibold transition-colors duration-200">
              {link.title}
              {link.badge ? (
                <span
                  className={cn(
                    "platform-module-badge rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-200",
                    isPlatform
                      ? "bg-[#0b213a]/8 text-[#0b213a] dark:bg-white/10 dark:text-white"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {link.badge}
                </span>
              ) : null}
            </span>
            <span className="platform-module-desc mt-1 line-clamp-2 text-xs text-muted-foreground transition-colors duration-200">
              {link.description}
            </span>
            <span
              className={cn(
                "platform-module-cta mt-3 inline-flex items-center text-xs font-medium opacity-0 transition-all duration-200 group-hover:opacity-100",
                isPlatform ? "text-[#1a4fd6]" : "text-primary",
              )}
            >
              Open
              <ArrowRightIcon className="ml-1 size-3.5" />
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

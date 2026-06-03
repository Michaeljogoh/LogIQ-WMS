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
  }>,
) {
  const cols =
    props.columns === 2
      ? "sm:grid-cols-2"
      : props.columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <Card>
      {props.title ? (
        <CardHeader>
          <CardTitle className="text-base">{props.title}</CardTitle>
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
            className="group flex flex-col rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-[#3874ff]/40 hover:bg-muted/30 hover:shadow-sm"
          >
            <link.icon className="mb-3 size-5 text-[#3874ff]" aria-hidden />
            <span className="flex items-center gap-2 text-sm font-semibold">
              {link.title}
              {link.badge ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {link.badge}
                </span>
              ) : null}
            </span>
            <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {link.description}
            </span>
            <span className="mt-3 inline-flex items-center text-xs font-medium text-[#3874ff] opacity-0 transition-opacity group-hover:opacity-100">
              Open
              <ArrowRightIcon className="ml-1 size-3.5" />
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

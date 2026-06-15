"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import {
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import {
  paginateRows,
  TablePagination,
} from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

type InsightRow = {
  id: string;
  severity: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string | null;
};

function severityMeta(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return {
        icon: AlertTriangle,
        badge: "destructive" as const,
        accent: "logiq-insight-card--critical",
      };
    case "WARNING":
      return {
        icon: AlertTriangle,
        badge: "secondary" as const,
        accent: "logiq-insight-card--warning",
      };
    default:
      return {
        icon: Info,
        badge: "outline" as const,
        accent: "logiq-insight-card--info",
      };
  }
}

export function InsightFeed(props: {
  items: InsightRow[];
  isLoading: boolean;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const ack = useMutation(
    trpc.logiq.acknowledgeInsight.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries(trpc.logiq.getInsights.queryFilter());
      },
    }),
  );

  const pageItems = paginateRows(props.items, page, PAGE_SIZE);

  return (
    <SettingsPanel className="w-full">
      <SettingsPanelHeader
        description="Actionable recommendations from stock, carrier, and capacity scans."
        icon={Lightbulb}
        title="Insight feed"
      />
      <SettingsPanelBody className="space-y-0 p-0">
        {props.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                className="h-28 animate-pulse rounded-xl bg-muted/50"
                key={i}
              />
            ))}
          </div>
        ) : props.items.length === 0 ? (
          <div className="logiq-insight-empty flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">All clear</p>
              <p className="text-sm text-muted-foreground">
                No open insights. Run intelligence scans to refresh
                recommendations.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/60">
              {pageItems.map((i) => {
                const meta = severityMeta(i.severity);
                const Icon = meta.icon;
                return (
                  <article
                    className={cn("logiq-insight-card group", meta.accent)}
                    key={i.id}
                  >
                    <div className="logiq-insight-card__accent" aria-hidden />
                    <div className="logiq-insight-card__body">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="logiq-insight-card__icon">
                            <Icon className="size-4" aria-hidden />
                          </div>
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={meta.badge}>{i.severity}</Badge>
                              <Badge className="font-normal" variant="outline">
                                {i.type.replaceAll("_", " ")}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-semibold leading-snug text-foreground">
                              {i.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {i.body}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {i.actionUrl ? (
                            <Button
                              asChild
                              className="logiq-insight-card__action min-h-9"
                              size="sm"
                              variant="outline"
                            >
                              <Link href={i.actionUrl}>
                                Open
                                <ArrowRight className="size-3.5" />
                              </Link>
                            </Button>
                          ) : null}
                          <Button
                            className="logiq-insight-card__action min-h-9"
                            disabled={ack.isPending}
                            onClick={() => ack.mutate({ insightId: i.id })}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Acknowledge
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <TablePagination
              label="Insights"
              onPageChange={setPage}
              page={page}
              pageSize={PAGE_SIZE}
              total={props.items.length}
            />
          </>
        )}
      </SettingsPanelBody>
    </SettingsPanel>
  );
}

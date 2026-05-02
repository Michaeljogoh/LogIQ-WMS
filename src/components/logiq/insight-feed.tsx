"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InsightRow = {
  id: string;
  severity: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string | null;
};

export function InsightFeed(props: {
  items: InsightRow[];
  isLoading: boolean;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const ack = useMutation(
    trpc.logiq.acknowledgeInsight.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries(trpc.logiq.getInsights.queryFilter());
      },
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insight feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : props.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open insights.</p>
        ) : (
          props.items.map((i) => (
            <div
              key={i.id}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    i.severity === "CRITICAL"
                      ? "destructive"
                      : i.severity === "WARNING"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {i.severity}
                </Badge>
                <Badge variant="outline">{i.type}</Badge>
              </div>
              <p className="font-medium">{i.title}</p>
              <p className="text-sm text-muted-foreground">{i.body}</p>
              <div className="flex flex-wrap gap-2">
                {i.actionUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={i.actionUrl} className="min-h-11">
                      Open
                    </a>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11"
                  disabled={ack.isPending}
                  onClick={() => ack.mutate({ insightId: i.id })}
                >
                  Acknowledge
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

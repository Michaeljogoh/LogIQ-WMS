"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const platforms = [
  "SHOPIFY",
  "WOOCOMMERCE",
  "BIGCOMMERCE",
  "ETSY",
  "TIKTOK_SHOP",
  "EBAY",
] as const;

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const integrationsQuery = useQuery(trpc.integration.list.queryOptions());
  const syncNow = useMutation(
    trpc.integration.syncNow.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.integration.list.queryFilter(),
        );
      },
    }),
  );
  const syncLogsQuery = useQuery(trpc.integration.getSyncLog.queryOptions({}));
  const disconnect = useMutation(
    trpc.integration.disconnect.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.integration.list.queryFilter(),
        );
      },
    }),
  );
  const integrations = (integrationsQuery.data ?? []) as Array<{
    id: string;
    type: (typeof platforms)[number];
    status: string;
    lastSyncAt: Date | string | null;
    metadata: unknown;
  }>;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketplace integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {platforms.map((platform) => {
            const integration = integrations.find(
              (item) => item.type === platform,
            );
            return (
              <div
                key={platform}
                className="grid gap-2 rounded-md border p-3 md:grid-cols-6 md:items-center"
              >
                <p className="font-medium">{platform}</p>
                <p>{integration?.status ?? "NOT_CONNECTED"}</p>
                <p>
                  Last sync:{" "}
                  {integration?.lastSyncAt
                    ? new Date(integration.lastSyncAt).toLocaleString()
                    : "Never"}
                </p>
                <p>
                  Orders:{" "}
                  {integration?.metadata &&
                  typeof integration.metadata === "object"
                    ? String(
                        (integration.metadata as { orderCount?: number })
                          .orderCount ?? 0,
                      )
                    : "0"}
                </p>
                <div>
                  <Link
                    href={`/portal/settings/integrations/${platform.toLowerCase()}/connect`}
                    className="text-primary hover:underline"
                  >
                    Connect
                  </Link>
                </div>
                <div className="flex gap-2">
                  {integration ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncNow.isPending}
                        onClick={() =>
                          syncNow.mutate({ integrationId: integration.id })
                        }
                      >
                        Sync
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={disconnect.isPending}
                        onClick={() =>
                          disconnect.mutate({ integrationId: integration.id })
                        }
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent sync logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {syncLogsQuery.data?.map((log) => (
            <div key={log.id} className="rounded-md border p-3">
              <p className="font-medium">
                {log.integration.type} - {log.status}
              </p>
              <p>
                fetched: {log.ordersFetched} | upserted: {log.ordersUpserted}
              </p>
              <p>{new Date(log.createdAt).toLocaleString()}</p>
              {log.errorMessage ? (
                <p className="text-destructive">{log.errorMessage}</p>
              ) : null}
            </div>
          ))}
          {!syncLogsQuery.data?.length ? <p>No sync activity yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

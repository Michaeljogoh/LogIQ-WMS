"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  Plug,
  RefreshCw,
  ShoppingBag,
  Unplug,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import {
  paginateRows,
  TablePagination,
} from "@/components/shared/table-pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const platforms = [
  "SHOPIFY",
  "WOOCOMMERCE",
  "BIGCOMMERCE",
  "ETSY",
  "TIKTOK_SHOP",
  "EBAY",
] as const;

const LOG_PAGE_SIZE = 6;

type IntegrationListItem = {
  id: string;
  type: string;
  status: string;
  metadata: unknown;
  lastSyncAt: Date | null;
};

function formatPlatform(platform: string) {
  return platform
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [logPage, setLogPage] = useState(0);
  const integrationsQuery = useQuery(trpc.integration.list.queryOptions());
  const syncLogsQuery = useQuery(trpc.integration.getSyncLog.queryOptions({}));

  const syncNow = useMutation(
    trpc.integration.syncNow.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.integration.list.queryFilter()),
          queryClient.invalidateQueries(trpc.integration.getSyncLog.queryFilter()),
        ]);
      },
    }),
  );

  const disconnect = useMutation(
    trpc.integration.disconnect.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.integration.list.queryFilter(),
        );
      },
    }),
  );

  const integrations = (integrationsQuery.data ?? []) as IntegrationListItem[];
  const syncLogs = syncLogsQuery.data ?? [];
  const pageLogs = paginateRows(syncLogs, logPage, LOG_PAGE_SIZE);

  const stats = useMemo(() => {
    const connected = integrations.filter((i) => i.status === "CONNECTED").length;
    const orders = integrations.reduce((sum, item) => {
      if (item.metadata && typeof item.metadata === "object") {
        return (
          sum +
          Number((item.metadata as { orderCount?: number }).orderCount ?? 0)
        );
      }
      return sum;
    }, 0);
    return { connected, orders, total: platforms.length };
  }, [integrations]);

  return (
    <SettingsPage>
      <PageHeader
        description="Connect marketplaces and sync orders into your 3PL fulfillment workflow."
        title="Integrations"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint="Available marketplaces"
          icon={ShoppingBag}
          isLoading={integrationsQuery.isLoading}
          label="Platforms"
          value={stats.total}
        />
        <KpiStatCard
          accent="success"
          hint="Live order sync"
          icon={Plug}
          isLoading={integrationsQuery.isLoading}
          label="Connected"
          value={stats.connected}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Imported via integrations"
          icon={RefreshCw}
          isLoading={integrationsQuery.isLoading}
          label="Orders synced"
          value={stats.orders}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Connect, sync, or disconnect each sales channel."
          icon={Link2}
          title="Marketplace connections"
        />
        <SettingsPanelBody>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {platforms.map((platform) => {
              const integration = integrations.find(
                (item) => item.type === platform,
              );
              const orderCount =
                integration?.metadata &&
                typeof integration.metadata === "object"
                  ? Number(
                      (integration.metadata as { orderCount?: number })
                        .orderCount ?? 0,
                    )
                  : 0;

              return (
                <article
                  className="portal-integration-card group"
                  key={platform}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="portal-integration-card__title text-sm font-bold">
                        {formatPlatform(platform)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {integration?.lastSyncAt
                          ? `Last sync ${new Date(integration.lastSyncAt).toLocaleString()}`
                          : "Never synced"}
                      </p>
                    </div>
                    <StatusBadge
                      status={integration?.status ?? "NOT_CONNECTED"}
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">
                      {orderCount}
                    </span>{" "}
                    orders imported
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/portal/settings/integrations/${platform.toLowerCase()}/connect`}
                      >
                        {integration ? "Manage" : "Connect"}
                      </Link>
                    </Button>
                    {integration ? (
                      <>
                        <Button
                          disabled={syncNow.isPending}
                          onClick={() =>
                            syncNow.mutate({ integrationId: integration.id })
                          }
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <RefreshCw className="size-3.5" aria-hidden />
                          Sync
                        </Button>
                        <Button
                          disabled={disconnect.isPending}
                          onClick={() =>
                            disconnect.mutate({ integrationId: integration.id })
                          }
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          <Unplug className="size-3.5" aria-hidden />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </SettingsPanelBody>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Recent sync attempts across all connected channels."
          icon={RefreshCw}
          title="Sync activity"
        />
        <SettingsPanelBody className="p-0">
          {syncLogsQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : syncLogs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No sync activity yet. Connect a marketplace to start importing
              orders.
            </p>
          ) : (
            <>
              <SettingsTableWrap>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fetched</TableHead>
                      <TableHead>Upserted</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageLogs.map((log) => (
                      <TableRow className="logiq-table-row" key={log.id}>
                        <TableCell className="font-medium">
                          {formatPlatform(log.integration.type)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "SUCCESS" ? "success" : "destructive"
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {log.ordersFetched}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {log.ordersUpserted}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SettingsTableWrap>
              <TablePagination
                label="Sync logs"
                onPageChange={setLogPage}
                page={logPage}
                pageSize={LOG_PAGE_SIZE}
                total={syncLogs.length}
              />
            </>
          )}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  BoxesIcon,
  TrendingDownIcon,
} from "lucide-react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MOVEMENT_DELTA_COLOR: Record<string, string> = {
  INBOUND: "text-success",
  OUTBOUND: "text-destructive",
  RECEIVE: "text-success",
  PICK: "text-destructive",
  ADJUST: "text-warning",
  ADJUSTMENT: "text-warning",
  TRANSFER: "text-info",
  RETURN: "text-warning",
  RETURN_RESTOCK: "text-success",
  RETURN_DISPOSE: "text-destructive",
  CYCLE_COUNT: "text-primary",
  CYCLE_COUNT_ADJUSTMENT: "text-primary",
  WORK_ORDER_CONSUME: "text-destructive",
  WORK_ORDER_PRODUCE: "text-success",
};

export default function Page() {
  const trpc = useTRPC();
  const productsQuery = useQuery(
    trpc.product.list.queryOptions({ page: 1, limit: 100 }),
  );
  const lowStockQuery = useQuery(trpc.alerts.getLowStock.queryOptions({}));
  const deadStockQuery = useQuery(trpc.alerts.getDeadStock.queryOptions({}));
  const movementQuery = useQuery(
    trpc.stockLevel.recentMovements.queryOptions({ limit: 20 }),
  );

  const items = productsQuery.data?.items ?? [];
  const units = items.reduce((sum, row) => sum + row.totalQuantity, 0);
  const activeSkuCount = items.filter((row) => row.isActive).length;
  const lowStockCount = lowStockQuery.data?.length ?? 0;
  const deadStockCount = deadStockQuery.data?.length ?? 0;

  return (
    <SettingsPage>
      <PageHeader
        description="Monitor SKU levels, movement activity, and cycle count health."
        title="Inventory"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          icon={BoxesIcon}
          isLoading={productsQuery.isLoading}
          label="Active SKUs"
          value={activeSkuCount.toLocaleString()}
        />
        <KpiStatCard
          accent="success"
          icon={ArchiveIcon}
          isLoading={productsQuery.isLoading}
          label="Units in stock"
          value={units.toLocaleString()}
        />
        <KpiStatCard
          accent="warning"
          hint="SKUs below reorder threshold"
          icon={AlertTriangleIcon}
          isLoading={lowStockQuery.isLoading}
          label="Low stock"
          value={lowStockCount.toLocaleString()}
        />
        <KpiStatCard
          accent={deadStockCount > 0 ? "warning" : "navy-teal"}
          hint="No movement in 90+ days"
          icon={TrendingDownIcon}
          isLoading={deadStockQuery.isLoading}
          label="Dead stock"
          value={deadStockCount.toLocaleString()}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Last 20 transactions across all warehouses"
          icon={ArchiveIcon}
          title="Recent stock movements"
        />
        <SettingsPanelBody className="p-0">
          {movementQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton columns={4} rows={6} />
            </div>
          ) : (movementQuery.data?.length ?? 0) === 0 ? (
            <div className="p-8">
              <EmptyState
                description="Stock movements appear here as orders are picked, received, and adjusted."
                icon={ArchiveIcon}
                title="No movements yet"
              />
            </div>
          ) : (
            <SettingsTableWrap className="border-0 rounded-none">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5 font-semibold text-foreground">
                      SKU
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Type
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground">
                      Delta
                    </TableHead>
                    <TableHead className="pr-5 text-right font-semibold text-foreground">
                      When
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementQuery.data?.map((row) => (
                    <TableRow className="transition-colors" key={row.id}>
                      <TableCell className="pl-5 font-medium text-foreground">
                        {row.product.sku}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={row.type} status={row.type} />
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono text-sm font-medium",
                          MOVEMENT_DELTA_COLOR[row.type] ?? "text-foreground",
                        )}
                      >
                        {row.quantityDelta > 0 ? "+" : ""}
                        {row.quantityDelta}
                      </TableCell>
                      <TableCell className="pr-5 text-right text-sm text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SettingsTableWrap>
          )}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

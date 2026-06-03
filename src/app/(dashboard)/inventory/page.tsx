"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  BoxesIcon,
  TrendingDownIcon,
} from "lucide-react";
import { useTRPC } from "@/app/trpc/client";
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

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: "success" | "warning" | "danger" | "default";
}) {
  const accentColor = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    default: "text-primary",
  }[accent ?? "default"];

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted",
          accentColor,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-2xl font-semibold tracking-tight",
            accentColor,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

const MOVEMENT_DELTA_COLOR: Record<string, string> = {
  RECEIVE: "text-success",
  PICK: "text-destructive",
  ADJUST: "text-warning",
  TRANSFER: "text-info",
  RETURN: "text-warning",
  CYCLE_COUNT: "text-primary",
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
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Inventory"
        description="Monitor SKU levels, movement activity, and cycle count health."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={BoxesIcon}
          label="Active SKUs"
          value={activeSkuCount.toLocaleString()}
          accent="default"
        />
        <KpiCard
          icon={ArchiveIcon}
          label="Units in stock"
          value={units.toLocaleString()}
          accent="success"
        />
        <KpiCard
          icon={AlertTriangleIcon}
          label="Low stock"
          value={lowStockCount.toLocaleString()}
          accent={lowStockCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={TrendingDownIcon}
          label="Dead stock"
          value={deadStockCount.toLocaleString()}
          accent={deadStockCount > 0 ? "danger" : "default"}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Recent stock movements</h2>
            <p className="text-xs text-muted-foreground">
              Last 20 transactions across all warehouses
            </p>
          </div>
        </div>
        {movementQuery.isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={4} />
          </div>
        ) : (movementQuery.data?.length ?? 0) === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ArchiveIcon}
              title="No movements yet"
              description="Stock movements appear here as orders are picked, received, and adjusted."
            />
          </div>
        ) : (
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
                <TableRow key={row.id} className="transition-colors">
                  <TableCell className="pl-5 font-medium text-foreground">
                    {row.product.sku}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.type} label={row.type} />
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
        )}
      </div>
    </div>
  );
}

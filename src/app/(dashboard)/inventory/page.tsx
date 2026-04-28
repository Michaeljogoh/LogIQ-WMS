"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const kpis = [
    { label: "Active SKUs", value: activeSkuCount.toLocaleString() },
    { label: "Units In Stock", value: units.toLocaleString() },
    {
      label: "Low Stock",
      value: (lowStockQuery.data?.length ?? 0).toLocaleString(),
    },
    {
      label: "Dead Stock",
      value: (deadStockQuery.data?.length ?? 0).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Monitor SKU levels, movement activity, and cycle count health.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent stock movements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Delta</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementQuery.data?.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.product.sku}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.quantityDelta}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {movementQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Loading movements...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

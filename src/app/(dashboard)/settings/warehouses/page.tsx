"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/app/trpc/client";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { CreateWarehouseDialog } from "@/components/settings/create-warehouse-dialog";
import { useOperatorRole } from "@/hooks/use-operator-role";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  const trpc = useTRPC();
  const { canCreateWarehouse } = useOperatorRole();
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());

  return (
    <div className="space-y-6 p-6">
      <OperatorPageHeader
        description={
          canCreateWarehouse
            ? "Fulfillment sites for inventory, orders, and team assignments."
            : "Fulfillment sites for inventory and orders."
        }
        title="Warehouses"
        actions={
          canCreateWarehouse ? (
            <CreateWarehouseDialog
              onSuccess={() => void warehousesQuery.refetch()}
            />
          ) : undefined
        }
      />

      {warehousesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading warehouses…</p>
      ) : null}

      {warehousesQuery.isError ? (
        <p className="text-sm text-destructive">
          {warehousesQuery.error.message}
        </p>
      ) : null}

      {canCreateWarehouse &&
      !warehousesQuery.isLoading &&
      (warehousesQuery.data?.length ?? 0) === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No warehouses yet</CardTitle>
            <CardDescription>
              Add your first warehouse to receive inventory, fulfill orders, and
              assign staff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWarehouseDialog
              onSuccess={() => void warehousesQuery.refetch()}
            />
          </CardContent>
        </Card>
      ) : null}
      {!canCreateWarehouse &&
      !warehousesQuery.isLoading &&
      (warehousesQuery.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          No warehouses are configured for this account yet.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {warehousesQuery.data?.map((warehouse) => (
          <Card key={warehouse.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{warehouse.name}</CardTitle>
                <Badge variant="secondary">{warehouse.code}</Badge>
              </div>
              <CardDescription>
                {warehouse.city}, {warehouse.state} {warehouse.zip}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>{warehouse.addressLine1}</p>
              <p>Timezone: {warehouse.timezone}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

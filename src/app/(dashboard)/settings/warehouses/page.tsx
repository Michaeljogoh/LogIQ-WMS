"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, Warehouse } from "lucide-react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { CreateWarehouseDialog } from "@/components/settings/create-warehouse-dialog";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { useOperatorRole } from "@/hooks/use-operator-role";

export default function Page() {
  const trpc = useTRPC();
  const { canCreateWarehouse } = useOperatorRole();
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const warehouses = warehousesQuery.data ?? [];
  const isLoading = warehousesQuery.isLoading;

  return (
    <SettingsPage>
      <PageHeader
        actions={
          canCreateWarehouse ? (
            <CreateWarehouseDialog
              onSuccess={() => void warehousesQuery.refetch()}
            />
          ) : undefined
        }
        description={
          canCreateWarehouse
            ? "Fulfillment sites for inventory, orders, and team assignments."
            : "Fulfillment sites for inventory and orders."
        }
        title="Warehouses"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint="Operating sites on your account"
          icon={Warehouse}
          isLoading={isLoading}
          label="Total warehouses"
          value={warehouses.length}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Unique cities across all sites"
          icon={MapPin}
          isLoading={isLoading}
          label="Locations"
          value={
            new Set(warehouses.map((w) => `${w.city}, ${w.state}`)).size
          }
        />
        <KpiStatCard
          accent="success"
          hint="Ready for inventory and fulfillment"
          icon={Warehouse}
          isLoading={isLoading}
          label="Active sites"
          value={warehouses.length}
        />
      </div>

      {warehousesQuery.isError ? (
        <p className="text-sm text-destructive">{warehousesQuery.error.message}</p>
      ) : null}

      <SettingsPanel>
        <SettingsPanelHeader
          description="Each warehouse is a fulfillment site with its own inventory, staff access, and printer assignments."
          icon={Warehouse}
          title="Your warehouses"
        />
        <SettingsPanelBody>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading warehouses…</p>
          ) : null}

          {!isLoading && warehouses.length === 0 ? (
            <EmptyState
              action={
                canCreateWarehouse ? (
                  <CreateWarehouseDialog
                    onSuccess={() => void warehousesQuery.refetch()}
                  />
                ) : undefined
              }
              description={
                canCreateWarehouse
                  ? "Add your first warehouse to receive inventory, fulfill orders, and assign staff."
                  : "No warehouses are configured for this account yet."
              }
              icon={Warehouse}
              title="No warehouses yet"
            />
          ) : null}

          {warehouses.length > 0 ? (
            <div className="settings-card-grid md:grid-cols-2 xl:grid-cols-3">
              {warehouses.map((warehouse) => (
                <article className="settings-entity-card" key={warehouse.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {warehouse.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {warehouse.city}, {warehouse.state} {warehouse.zip}
                      </p>
                    </div>
                    <Badge variant="secondary">{warehouse.code}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>{warehouse.addressLine1}</p>
                    <p className="text-xs">Timezone: {warehouse.timezone}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Box, MapPin, Package, PrinterIcon, Warehouse } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Page() {
  const trpc = useTRPC();
  const locationsQuery = useQuery(trpc.stockLevel.locations.queryOptions({}));
  const zones = locationsQuery.data ?? [];

  const stats = useMemo(() => {
    let bins = 0;
    let skus = 0;
    let units = 0;
    for (const zone of zones) {
      bins += zone.bins.length;
      for (const bin of zone.bins) {
        skus += bin.skuCount;
        units += bin.units;
      }
    }
    return { zones: zones.length, bins, skus, units };
  }, [zones]);

  const printBinMutation = useMutation(
    trpc.label.generateBin.mutationOptions({
      onSuccess: (data) => {
        toast.success("Bin label generated");
        window.open(data.viewUrl, "_blank", "noopener,noreferrer");
      },
      onError: (err) => {
        toast.error(err.message ?? "Could not generate bin label");
      },
    }),
  );

  return (
    <SettingsPage>
      <PageHeader
        description="Browse warehouse zones and bin occupancy across your fulfillment sites."
        title="Locations"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="Storage zones configured"
          icon={Warehouse}
          isLoading={locationsQuery.isLoading}
          label="Zones"
          value={stats.zones}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Pick and storage bins"
          icon={MapPin}
          isLoading={locationsQuery.isLoading}
          label="Bins"
          value={stats.bins}
        />
        <KpiStatCard
          accent="navy-violet"
          hint="SKUs stored across bins"
          icon={Package}
          isLoading={locationsQuery.isLoading}
          label="SKUs located"
          value={stats.skus}
        />
        <KpiStatCard
          accent="success"
          hint="Total units on hand"
          icon={Package}
          isLoading={locationsQuery.isLoading}
          label="Units in bins"
          value={stats.units.toLocaleString()}
        />
      </div>

      {locationsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading locations…</p>
      ) : null}

      {!locationsQuery.isLoading && zones.length === 0 ? (
        <EmptyState
          description="Zones and bins appear here once your warehouse layout is configured."
          icon={MapPin}
          title="No locations found"
        />
      ) : null}

      <div className="space-y-4">
        {zones.map((zone) => (
          <SettingsPanel key={zone.id}>
            <SettingsPanelHeader
              actions={
                <Badge variant="secondary">{zone.bins.length} bins</Badge>
              }
              description={`Zone ${zone.code} — ${zone.name}`}
              icon={MapPin}
              title={`Zone ${zone.code}`}
            />
            <SettingsPanelBody className="location-zone-body">
              <div className="location-bin-grid sm:grid-cols-2 lg:grid-cols-3">
                {zone.bins.map((bin) => {
                  const isEmpty = bin.units === 0 && bin.skuCount === 0;
                  const isActive = bin.units > 0;

                  return (
                    <article
                      className={cn(
                        "location-bin-card",
                        isEmpty && "location-bin-card--empty",
                        isActive && "location-bin-card--active",
                      )}
                      key={bin.id}
                    >
                      <div className="location-bin-card__header">
                        <div className="location-bin-card__icon">
                          <Box className="size-4" aria-hidden />
                        </div>
                        <p className="location-bin-card__label min-w-0 flex-1 text-foreground">
                          {bin.label}
                        </p>
                      </div>

                      <div className="location-bin-card__stats">
                        <span className="location-bin-card__stat">
                          {bin.skuCount} SKU{bin.skuCount === 1 ? "" : "s"}
                        </span>
                        <span className="location-bin-card__stat">
                          {bin.units.toLocaleString()} units
                        </span>
                      </div>

                      <button
                        className="location-bin-card__print"
                        disabled={printBinMutation.isPending}
                        onClick={() =>
                          printBinMutation.mutate({ binId: bin.id })
                        }
                        type="button"
                      >
                        <PrinterIcon className="size-4 shrink-0" aria-hidden />
                        Print bin label
                      </button>
                    </article>
                  );
                })}
              </div>
            </SettingsPanelBody>
          </SettingsPanel>
        ))}
      </div>
    </SettingsPage>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const trpc = useTRPC();
  const locationsQuery = useQuery(trpc.stockLevel.locations.queryOptions({}));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Browse warehouse zones and bin occupancy in a responsive grid.
        </p>
      </div>

      <div className="space-y-4">
        {locationsQuery.data?.map((zone) => (
          <Card key={zone.code}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Zone {zone.code} - {zone.name}
              </CardTitle>
              <Badge variant="outline">{zone.bins.length} bins</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {zone.bins.map((bin) => (
                  <div
                    key={bin.label}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <p className="font-medium">{bin.label}</p>
                    <p className="text-muted-foreground">{bin.skuCount} SKUs</p>
                    <p className="text-muted-foreground">{bin.units} units</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {locationsQuery.isLoading ? (
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Loading locations...
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

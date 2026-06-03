"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const trpc = useTRPC();
  const locationsQuery = useQuery(trpc.stockLevel.locations.queryOptions({}));

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Browse warehouse zones and bin occupancy in a responsive grid.
        </p>
      </div>

      <div className="space-y-4">
        {locationsQuery.data?.map((zone) => (
          <Card key={zone.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Zone {zone.code} - {zone.name}
              </CardTitle>
              <Badge variant="outline">{zone.bins.length} bins</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {zone.bins.map((bin) => (
                  <div key={bin.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{bin.label}</p>
                    <p className="text-muted-foreground">{bin.skuCount} SKUs</p>
                    <p className="text-muted-foreground">{bin.units} units</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 min-h-11 w-full gap-2"
                      disabled={printBinMutation.isPending}
                      onClick={() => printBinMutation.mutate({ binId: bin.id })}
                    >
                      <PrinterIcon className="size-4" aria-hidden />
                      Print bin label
                    </Button>
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

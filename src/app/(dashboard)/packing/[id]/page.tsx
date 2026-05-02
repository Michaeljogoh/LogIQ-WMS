"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DIM_KEYS = ["USPS", "FedEx", "UPS", "DHL"] as const;

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default function PackingStationPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    ...trpc.order.getById.queryOptions({ orderId }),
    enabled: Boolean(orderId),
  });

  const suggestQuery = useQuery({
    ...trpc.packaging.suggest.queryOptions({ orderId }),
    enabled: Boolean(orderId),
  });

  const suggestions = suggestQuery.data?.suggestions ?? [];
  const itemsWeightOz = suggestQuery.data?.itemsWeightOz ?? 0;

  const [selectedPackagingId, setSelectedPackagingId] = useState<string | null>(
    null,
  );
  const [weightOverrideOz, setWeightOverrideOz] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedPackagingId && suggestions[0]?.id) {
      setSelectedPackagingId(suggestions[0].id);
    }
  }, [selectedPackagingId, suggestions]);

  const selected = useMemo(
    () => suggestions.find((s) => s.id === selectedPackagingId) ?? null,
    [suggestions, selectedPackagingId],
  );

  const defaultWeightOz =
    selected !== null
      ? Math.max(0.1, itemsWeightOz + selected.tareWeightOz)
      : Math.max(0.1, itemsWeightOz || 1);

  const weightForRates = weightOverrideOz ?? defaultWeightOz;

  const ratesQuery = useQuery({
    ...trpc.shipment.rateShop.queryOptions({
      orderId,
      weightOz: Math.max(0.1, weightForRates),
      parcelLengthIn: selected?.lengthIn,
      parcelWidthIn: selected?.widthIn,
      parcelHeightIn: selected?.heightIn,
    }),
    enabled: Boolean(orderId),
  });

  const [selectedRateId, setSelectedRateId] = useState("");

  const buyLabel = useMutation(
    trpc.shipment.buyLabel.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.order.getById.queryFilter({ orderId }),
        );
      },
    }),
  );

  const order = orderQuery.data;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Packing station
          </h1>
          <p className="text-sm text-muted-foreground">
            Confirm packaging, verify billable weight vs DIM, then rate shop.
          </p>
        </div>
        {order ? (
          <Badge variant="outline">
            {order.merchant.name} · {order.channel}
          </Badge>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order?.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.product.sku}</TableCell>
                  <TableCell>{line.product.name}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                </TableRow>
              ))}
              {orderQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Packaging suggester</CardTitle>
          <Button variant="outline" size="sm" className="min-h-11" asChild>
            <Link href="/settings/packaging">Manage boxes</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Calculating suggestions…
            </p>
          ) : null}
          {!suggestQuery.isLoading && suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No packaging types fit this order (volume or weight). Add active{" "}
              <Link className="underline" href="/settings/packaging">
                packaging types
              </Link>
              .
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => {
                  setSelectedPackagingId(box.id);
                  setWeightOverrideOz(null);
                }}
                className={`rounded-lg border p-4 text-left transition-colors min-h-[44px] touch-manipulation ${
                  selectedPackagingId === box.id
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:bg-muted/40"
                }`}
              >
                <p className="font-medium">{box.name}</p>
                <p className="text-xs text-muted-foreground">
                  {box.lengthIn}" × {box.widthIn}" × {box.heightIn}" · tare{" "}
                  {box.tareWeightOz} oz
                </p>
                <p className="text-xs text-muted-foreground">
                  Box cost {formatMoney(box.costCents)} · max {box.maxWeightOz}{" "}
                  oz load
                </p>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="space-y-2 overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carrier</TableHead>
                    <TableHead className="text-right">DIM wt (oz)</TableHead>
                    <TableHead className="text-right">Billable (oz)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DIM_KEYS.map((k) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell className="text-right">
                        {selected.dimWeightOzByCarrier[k].toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {selected.billableWeightOzByCarrier[k].toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Items weight {itemsWeightOz.toFixed(2)} oz + tare{" "}
                {selected.tareWeightOz} oz = physical parcel{" "}
                {(itemsWeightOz + selected.tareWeightOz).toFixed(2)} oz used for
                rating below (override if scale differs).
              </p>
            </div>
          ) : null}

          <div className="grid max-w-md gap-2">
            <Label htmlFor="wt">Parcel weight for rate shop (oz)</Label>
            <Input
              id="wt"
              className="h-11"
              type="number"
              min={0.1}
              step={0.1}
              value={weightOverrideOz ?? defaultWeightOz}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) {
                  setWeightOverrideOz(v);
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate shop</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Select</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Transit</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratesQuery.data?.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <input
                      type="radio"
                      className="size-4"
                      checked={selectedRateId === rate.id}
                      onChange={() => setSelectedRateId(rate.id)}
                    />
                  </TableCell>
                  <TableCell>{rate.carrier}</TableCell>
                  <TableCell>{rate.service}</TableCell>
                  <TableCell>{rate.estimatedDays} days</TableCell>
                  <TableCell>${(rate.rateCents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    {rate.isCheapest ? "Cheapest " : ""}
                    {rate.isFastest ? "Fastest " : ""}
                    {rate.logiqRecommended ? "LogIQ Recommended" : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            className="h-11 min-w-44"
            disabled={
              buyLabel.isPending ||
              !selectedRateId ||
              !orderId ||
              (suggestions.length > 0 && !selectedPackagingId)
            }
            onClick={() =>
              buyLabel.mutate({
                orderId,
                rateId: selectedRateId,
                weightOz: Math.max(0.1, weightForRates),
                packagingTypeId:
                  suggestions.length > 0
                    ? (selectedPackagingId ?? undefined)
                    : undefined,
              })
            }
          >
            Buy label
          </Button>
          {suggestions.length > 0 && !selectedPackagingId ? (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Select a packaging option before buying a label.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

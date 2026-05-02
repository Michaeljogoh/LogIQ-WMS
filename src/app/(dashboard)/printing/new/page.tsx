"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RateRow = {
  id: string;
  carrier: string;
  service: string;
  rateCents: number;
};

export default function NewPrintQueuePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const packagingQuery = useQuery(trpc.packaging.list.queryOptions({}));

  const [warehouseId, setWarehouseId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [weightOz, setWeightOz] = useState<Record<string, number>>({});
  const [packagingTypeId, setPackagingTypeId] = useState<
    Record<string, string | undefined>
  >({});
  const [ratesByOrder, setRatesByOrder] = useState<Record<string, RateRow[]>>(
    {},
  );
  const [ratePick, setRatePick] = useState<Record<string, string>>({});

  const ordersQuery = useQuery({
    ...trpc.printQueue.unfulfilledOrders.queryOptions({
      warehouseId,
    }),
    enabled: Boolean(warehouseId),
  });

  const toggleRow = (orderId: string) => {
    setSelected((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const loadRates = useMutation({
    mutationFn: async () => {
      const ids = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const nextRates: Record<string, RateRow[]> = {};
      const nextPick: Record<string, string> = { ...ratePick };
      for (const orderId of ids) {
        const w = weightOz[orderId] ?? 16;
        const pkgId = packagingTypeId[orderId];
        const pkg = packagingQuery.data?.find((p) => p.id === pkgId);
        const rows = await queryClient.fetchQuery(
          trpc.shipment.rateShop.queryOptions({
            orderId,
            weightOz: Math.max(0.1, w),
            parcelLengthIn: pkg?.lengthIn,
            parcelWidthIn: pkg?.widthIn,
            parcelHeightIn: pkg?.heightIn,
          }),
        );
        nextRates[orderId] = rows;
        if (rows[0]?.id && !nextPick[orderId]) {
          nextPick[orderId] = rows[0].id;
        }
      }
      setRatesByOrder(nextRates);
      setRatePick(nextPick);
    },
  });

  const createQueue = useMutation(
    trpc.printQueue.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.printQueue.list.queryFilter());
      },
    }),
  );

  const packagingTypes = packagingQuery.data ?? [];

  const selectedOrderIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
  );

  const onSubmit = () => {
    if (!warehouseId || !batchName.trim()) {
      return;
    }
    if (!selectedOrderIds.length) {
      return;
    }
    for (const orderId of selectedOrderIds) {
      if (!ratePick[orderId]) {
        window.alert(
          `Choose a carrier rate for order row ${orderId.slice(0, 8)}… (use “Load rates for selection”).`,
        );
        return;
      }
    }
    const items = selectedOrderIds.map((orderId) => {
      const easypostRateId = ratePick[orderId];
      if (!easypostRateId) {
        throw new Error("Missing carrier rate for a selected order.");
      }
      return {
        orderId,
        easypostRateId,
        weightOz: weightOz[orderId] ?? 16,
        packagingTypeId: packagingTypeId[orderId],
      };
    });
    createQueue.mutate(
      { warehouseId, name: batchName.trim(), items },
      {
        onSuccess: async (data) => {
          window.location.href = `/printing/${data.id}`;
        },
      },
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          New print queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a warehouse, choose unfulfilled orders, rate shop each row,
          then create the batch.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue details</CardTitle>
          <CardDescription>
            All orders must belong to the same warehouse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="wh">Warehouse</Label>
            <Select
              value={warehouseId || undefined}
              onValueChange={(v) => {
                setWarehouseId(v);
                setSelected({});
                setRatesByOrder({});
                setRatePick({});
              }}
            >
              <SelectTrigger id="wh">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {(warehousesQuery.data ?? []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nm">Batch name</Label>
            <Input
              id="nm"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="EOD Batch"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Weight defaults to 16 oz; packaging optional for DIM-aware rating.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={
                !warehouseId || !selectedOrderIds.length || loadRates.isPending
              }
              onClick={() => loadRates.mutate()}
            >
              Load rates for selection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Order</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Weight (oz)</TableHead>
                <TableHead>Packaging</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ordersQuery.data ?? []).map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={Boolean(selected[order.id])}
                      onChange={() => toggleRow(order.id)}
                      aria-label={`Select ${order.channelOrderId}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {order.channelOrderId}
                  </TableCell>
                  <TableCell>{order.merchant.name}</TableCell>
                  <TableCell className="max-w-[120px]">
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={weightOz[order.id] ?? 16}
                      onChange={(e) =>
                        setWeightOz((prev) => ({
                          ...prev,
                          [order.id]: Number(e.target.value),
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <Select
                      value={packagingTypeId[order.id] ?? "__none__"}
                      onValueChange={(v) =>
                        setPackagingTypeId((prev) => ({
                          ...prev,
                          [order.id]: v === "__none__" ? undefined : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {packagingTypes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <Select
                      value={ratePick[order.id] ?? ""}
                      onValueChange={(v) =>
                        setRatePick((prev) => ({ ...prev, [order.id]: v }))
                      }
                      disabled={!ratesByOrder[order.id]?.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Load rates first" />
                      </SelectTrigger>
                      <SelectContent>
                        {(ratesByOrder[order.id] ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.carrier} {r.service} — $
                            {(r.rateCents / 100).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {warehouseId &&
              !ordersQuery.data?.length &&
              !ordersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm">
                    No unfulfilled pending orders in this warehouse.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={onSubmit}
              disabled={
                createQueue.isPending ||
                !warehouseId ||
                !batchName.trim() ||
                !selectedOrderIds.length
              }
            >
              Create queue
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/printing">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function TransferDetailPage() {
  const params = useParams<{ id: string }>();
  const transferId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const transferQuery = useQuery({
    ...trpc.transfer.getById.queryOptions({ transferId }),
    enabled: Boolean(transferId),
  });

  const transfer = transferQuery.data;

  const locQuery = useQuery({
    ...trpc.stockLevel.locations.queryOptions({
      warehouseId: transfer?.toWarehouseId ?? "",
    }),
    enabled: Boolean(transfer?.toWarehouseId),
  });

  const binOptions = useMemo(() => {
    const zones = locQuery.data ?? [];
    const bins: { id: string; label: string }[] = [];
    for (const z of zones) {
      for (const b of z.bins) {
        bins.push({ id: b.id, label: `${z.code} / ${b.label}` });
      }
    }
    return bins;
  }, [locQuery.data]);

  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [receiveBin, setReceiveBin] = useState<Record<string, string>>({});

  const shipMut = useMutation(
    trpc.transfer.ship.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.transfer.getById.queryFilter({ transferId }),
        );
      },
    }),
  );

  const receiveMut = useMutation(
    trpc.transfer.receive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.transfer.getById.queryFilter({ transferId }),
        );
        setReceiveQty({});
        setReceiveBin({});
      },
    }),
  );

  if (!transfer && transferQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading transfer…</div>
    );
  }

  if (!transfer) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Transfer not found.</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/transfers">Back</Link>
        </Button>
      </div>
    );
  }

  const canShip = transfer.status === "PENDING";
  const canReceive =
    transfer.status === "SHIPPED" || transfer.status === "PARTIALLY_RECEIVED";

  const submitReceive = () => {
    const lines: { lineId: string; qty: number; toBinId: string }[] = [];
    for (const line of transfer.lines) {
      const q = receiveQty[line.id] ?? 0;
      const bin = receiveBin[line.id];
      if (q <= 0 || !bin) {
        continue;
      }
      const max = line.shippedQty - line.receivedQty;
      if (q > max) {
        window.alert(`Qty too high for ${line.product.sku}`);
        return;
      }
      lines.push({ lineId: line.id, qty: q, toBinId: bin });
    }
    if (!lines.length) {
      window.alert("Enter quantity and bin for at least one line.");
      return;
    }
    receiveMut.mutate({ transferId, lines });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight font-mono">
            {transfer.toNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {transfer.fromWarehouse.code} → {transfer.toWarehouse.code} ·{" "}
            <Badge variant="outline">{transfer.status}</Badge>
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/transfers">All transfers</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ship from source</CardTitle>
          <CardDescription>
            Deducts inventory from the source warehouse (FIFO / FEFO by bin).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            disabled={!canShip || shipMut.isPending}
            onClick={() => shipMut.mutate({ transferId })}
          >
            Ship full transfer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receive at destination</CardTitle>
          <CardDescription>
            Enter receive quantity and putaway bin per line (staging / scan
            workflow).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Shipped</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Qty now</TableHead>
                <TableHead>Bin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfer.lines.map((line) => {
                const max = line.shippedQty - line.receivedQty;
                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-sm">
                      {line.product.sku}
                    </TableCell>
                    <TableCell>{line.requestedQty}</TableCell>
                    <TableCell>{line.shippedQty}</TableCell>
                    <TableCell>{line.receivedQty}</TableCell>
                    <TableCell className="max-w-[100px]">
                      <Input
                        type="number"
                        min={0}
                        max={max}
                        disabled={!canReceive || max <= 0}
                        value={receiveQty[line.id] ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setReceiveQty((prev) => ({
                            ...prev,
                            [line.id]: Number(e.target.value),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Select
                        value={receiveBin[line.id] ?? ""}
                        onValueChange={(v) =>
                          setReceiveBin((prev) => ({
                            ...prev,
                            [line.id]: v,
                          }))
                        }
                        disabled={!canReceive || max <= 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Bin" />
                        </SelectTrigger>
                        <SelectContent>
                          {binOptions.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Button
            type="button"
            disabled={!canReceive || receiveMut.isPending || !binOptions.length}
            onClick={submitReceive}
          >
            Record receive
          </Button>
          {!binOptions.length && canReceive ? (
            <p className="text-sm text-destructive">
              No bins found in destination warehouse — create zones/bins under
              inventory locations first.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

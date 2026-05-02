"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function itemBadge(status: string) {
  const variant =
    status === "PURCHASED" || status === "PRINTED"
      ? "default"
      : status === "FAILED"
        ? "destructive"
        : status === "REPRINTED"
          ? "secondary"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function PrintQueueDetailPage() {
  const params = useParams<{ id: string }>();
  const queueId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [printerId, setPrinterId] = useState("");

  const queueQuery = useQuery({
    ...trpc.printQueue.getById.queryOptions({ queueId }),
    enabled: Boolean(queueId),
  });

  const queue = queueQuery.data;

  const printersQuery = useQuery({
    ...trpc.printer.list.queryOptions(),
    enabled: Boolean(queue?.warehouseId),
  });

  const printersForWarehouse = useMemo(() => {
    if (!queue?.warehouseId) {
      return [];
    }
    return (printersQuery.data ?? []).filter(
      (p) => p.warehouseId === queue.warehouseId,
    );
  }, [printersQuery.data, queue?.warehouseId]);

  const purchase = useMutation(
    trpc.printQueue.purchase.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.printQueue.getById.queryFilter({ queueId }),
        );
        await queryClient.invalidateQueries(trpc.printQueue.list.queryFilter());
      },
    }),
  );

  const printAll = useMutation(
    trpc.printQueue.printAll.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.printQueue.getById.queryFilter({ queueId }),
        );
      },
    }),
  );

  const manifest = useMutation(
    trpc.printQueue.generateManifest.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.printQueue.getById.queryFilter({ queueId }),
        );
      },
    }),
  );

  const reprint = useMutation(
    trpc.printQueue.reprint.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.printQueue.getById.queryFilter({ queueId }),
        );
      },
    }),
  );

  if (!queue && queueQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading queue…</div>
    );
  }

  if (!queue) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Queue not found.</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/printing">Back</Link>
        </Button>
      </div>
    );
  }

  const pendingCount = queue.items.filter((i) => i.status === "PENDING").length;
  const hasPurchased = queue.items.some((i) =>
    ["PURCHASED", "PRINTED", "REPRINTED"].includes(i.status),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{queue.name}</h1>
          <p className="text-sm text-muted-foreground">
            {queue.warehouse.code} — {queue.warehouse.name} ·{" "}
            <Badge variant="outline">{queue.status}</Badge>
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/printing">All queues</Link>
        </Button>
      </div>

      {queue.manifestFormUrl ? (
        <Alert>
          <AlertTitle>USPS SCAN form</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <a
              className="text-primary underline"
              href={queue.manifestFormUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download SCAN form
            </a>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Purchase labels with EasyPost (concurrency 5), then print ZPL to a
            registered thermal printer on this warehouse.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <Button
            type="button"
            disabled={
              purchase.isPending ||
              !pendingCount ||
              queue.status === "PURCHASING"
            }
            onClick={() => purchase.mutate({ queueId })}
          >
            Purchase all pending labels
          </Button>

          <div className="flex flex-col gap-2 min-w-[220px]">
            <span className="text-xs font-medium text-muted-foreground">
              Thermal printer
            </span>
            <Select value={printerId || undefined} onValueChange={setPrinterId}>
              <SelectTrigger>
                <SelectValue placeholder="Select printer" />
              </SelectTrigger>
              <SelectContent>
                {printersForWarehouse.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.ipAddress})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={
              printAll.isPending ||
              !printerId ||
              !queue.items.some((i) => i.status === "PURCHASED")
            }
            onClick={() => printAll.mutate({ queueId, printerId })}
          >
            Print all purchased labels
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={manifest.isPending || !hasPurchased}
            onClick={() => manifest.mutate({ queueId })}
          >
            Generate USPS SCAN form
          </Button>
        </CardContent>
      </Card>

      {printAll.data?.errors?.length ? (
        <Alert variant="destructive">
          <AlertTitle>Print errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 text-sm">
              {printAll.data.errors.map((e) => (
                <li key={e.itemId}>
                  {e.itemId}: {e.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Labels</CardTitle>
          <CardDescription>
            Item status tracks purchase and thermal print. Reprint sends ZPL
            again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Reprint</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">
                    {row.order.channelOrderId}
                  </TableCell>
                  <TableCell>{row.order.merchant.name}</TableCell>
                  <TableCell>{itemBadge(row.status)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.shipment?.trackingNumber ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                    {row.errorMessage ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={
                        reprint.isPending ||
                        !printerId ||
                        !row.shipment ||
                        !["PURCHASED", "PRINTED", "REPRINTED"].includes(
                          row.status,
                        )
                      }
                      onClick={() =>
                        reprint.mutate({
                          printQueueItemId: row.id,
                          printerId,
                        })
                      }
                    >
                      Reprint
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

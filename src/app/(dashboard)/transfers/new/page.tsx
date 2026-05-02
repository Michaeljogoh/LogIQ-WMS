"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
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

type LineRow = { productId: string; sku: string; name: string; requestedQty: number };

export default function NewTransferPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const productsQuery = useQuery(
    trpc.product.list.queryOptions({ page: 1, limit: 100 }),
  );

  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [lines, setLines] = useState<LineRow[]>([]);
  const [productPick, setProductPick] = useState("");
  const [qty, setQty] = useState(1);

  const create = useMutation(
    trpc.transfer.create.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(trpc.transfer.list.queryFilter());
        window.location.href = `/transfers/${data.id}`;
      },
    }),
  );

  const addLine = () => {
    const p = productsQuery.data?.items.find((x) => x.id === productPick);
    if (!p || qty < 1) {
      return;
    }
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.productId === p.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = {
          ...next[existing]!,
          requestedQty: next[existing]!.requestedQty + qty,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          requestedQty: qty,
        },
      ];
    });
    setQty(1);
  };

  const submit = () => {
    if (!fromWarehouseId || !toWarehouseId || !lines.length) {
      return;
    }
    create.mutate({
      fromWarehouseId,
      toWarehouseId,
      lines: lines.map((l) => ({
        productId: l.productId,
        requestedQty: l.requestedQty,
      })),
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New transfer</h1>
        <p className="text-sm text-muted-foreground">
          Ship from source warehouse; receive into destination bins on the detail
          page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Warehouses</CardTitle>
          <CardDescription>Source and destination must differ.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 max-w-2xl">
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Source warehouse" />
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
            <Label>To</Label>
            <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Destination warehouse" />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2 min-w-[200px]">
              <Label>Product</Label>
              <Select value={productPick} onValueChange={setProductPick}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SKU" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {(productsQuery.data?.items ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-24">
              <Label htmlFor="q">Qty</Label>
              <Input
                id="q"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </div>
            <Button type="button" variant="secondary" onClick={addLine}>
              Add line
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.productId}>
                  <TableCell className="font-mono text-sm">{l.sku}</TableCell>
                  <TableCell>{l.name}</TableCell>
                  <TableCell className="text-right">{l.requestedQty}</TableCell>
                </TableRow>
              ))}
              {!lines.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm">
                    Add at least one line.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={submit}
              disabled={
                create.isPending ||
                !fromWarehouseId ||
                !toWarehouseId ||
                fromWarehouseId === toWarehouseId ||
                !lines.length
              }
            >
              Create transfer
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/transfers">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

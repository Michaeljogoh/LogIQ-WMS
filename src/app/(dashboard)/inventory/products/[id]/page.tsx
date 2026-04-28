"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Page({ params }: Readonly<{ params: { id: string } }>) {
  const trpc = useTRPC();
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");

  const productQuery = useQuery(
    trpc.product.getById.queryOptions({ productId: params.id }),
  );

  useEffect(() => {
    if (!productQuery.data) {
      return;
    }
    setName(productQuery.data.name);
    setBarcode(productQuery.data.barcode ?? "");
    setLowStockThreshold(productQuery.data.lowStockThreshold?.toString() ?? "");
  }, [productQuery.data]);

  const updateMutation = useMutation(
    trpc.product.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Product updated");
        await productQuery.refetch();
      },
      onError: () => {
        toast.error("Failed to update product");
      },
    }),
  );

  const product = productQuery.data;
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product detail
          </h1>
          <p className="text-sm text-muted-foreground">
            Track stock by bin and review recent movement activity.
          </p>
        </div>
        <Badge variant="outline">{product?.sku ?? "Loading..."}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stock by location</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product?.stockLevels.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.bin.label.split("-")[0] ?? "-"}</TableCell>
                    <TableCell>{row.bin.label}</TableCell>
                    <TableCell className="text-right">{row.quantity}</TableCell>
                    <TableCell className="text-right">
                      {row.reservedQty}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.quantity - row.reservedQty}
                    </TableCell>
                  </TableRow>
                ))}
                {productQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      Loading stock levels...
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Product name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              placeholder="Barcode"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
            />
            <Input
              placeholder="Low stock threshold"
              value={lowStockThreshold}
              onChange={(event) => setLowStockThreshold(event.target.value)}
            />
            <Button
              className="w-full"
              disabled={updateMutation.isPending || !product}
              onClick={() => {
                if (!product) {
                  return;
                }
                updateMutation.mutate({
                  productId: product.id,
                  name,
                  barcode: barcode.trim() || null,
                  lowStockThreshold:
                    lowStockThreshold.trim() === ""
                      ? null
                      : Number.parseInt(lowStockThreshold, 10),
                });
              }}
            >
              {updateMutation.isPending ? "Saving..." : "Save updates"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Delta</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product?.movements.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.type}</TableCell>
                  <TableCell className="text-right">
                    {row.quantityDelta}
                  </TableCell>
                  <TableCell>
                    {row.referenceId ?? row.referenceType ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
              {productQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    Loading movements...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

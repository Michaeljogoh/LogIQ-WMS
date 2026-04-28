"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Page() {
  const trpc = useTRPC();
  const merchantsQuery = useQuery(trpc.merchant.list.queryOptions());
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const suppliersQuery = useQuery(trpc.supplier.list.queryOptions());
  const [merchantId, setMerchantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("1");

  const productsQuery = useQuery(
    trpc.product.list.queryOptions({
      merchantId: merchantId || undefined,
      page: 1,
      limit: 100,
    }),
  );
  const [productId, setProductId] = useState("");

  const createPo = useMutation(trpc.purchaseOrder.create.mutationOptions());

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>New purchase order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Select value={merchantId} onValueChange={setMerchantId}>
              <SelectTrigger>
                <SelectValue placeholder="Merchant" />
              </SelectTrigger>
              <SelectContent>
                {merchantsQuery.data?.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehousesQuery.data?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliersQuery.data?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={expectedDate}
              onChange={(event) => setExpectedDate(event.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                {productsQuery.data?.items.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Internal note"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
            />
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
            />
          </div>

          <Button
            disabled={
              createPo.isPending ||
              !merchantId ||
              !warehouseId ||
              !supplierId ||
              !productId
            }
            onClick={() =>
              createPo.mutate({
                merchantId,
                warehouseId,
                supplierId,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                notes: sku.trim() || null,
                sendNow: true,
                lines: [
                  {
                    productId,
                    orderedQty: Math.max(1, Number(qty) || 1),
                  },
                ],
              })
            }
          >
            Create PO
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

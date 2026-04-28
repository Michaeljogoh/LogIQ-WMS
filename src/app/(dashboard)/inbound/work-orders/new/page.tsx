"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const merchantsQuery = useQuery(trpc.merchant.list.queryOptions());
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const [merchantId, setMerchantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState<
    "KITTING" | "ASSEMBLY" | "BUNDLING" | "REPACKAGING"
  >("KITTING");
  const [targetQty, setTargetQty] = useState("1");
  const [outputProductId, setOutputProductId] = useState("");
  const [outputBinId, setOutputBinId] = useState("");
  const [qtyPerUnit, setQtyPerUnit] = useState("1");
  const [inputProductId, setInputProductId] = useState("");

  const productsQuery = useQuery(
    trpc.product.list.queryOptions({
      merchantId: merchantId || undefined,
      page: 1,
      limit: 100,
    }),
  );

  const createWorkOrder = useMutation(trpc.workOrder.create.mutationOptions());
  const workOrdersQuery = useQuery(trpc.workOrder.list.queryOptions({}));
  const [completeQtyById, setCompleteQtyById] = useState<
    Record<string, string>
  >({});
  const startWorkOrder = useMutation(
    trpc.workOrder.start.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.workOrder.list.queryFilter({}),
        );
      },
    }),
  );
  const completeWorkOrder = useMutation(
    trpc.workOrder.complete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.workOrder.list.queryFilter({}),
        );
      },
    }),
  );
  const locationsQuery = useQuery(
    trpc.stockLevel.locations.queryOptions({
      warehouseId: warehouseId || undefined,
    }),
  );
  const warehouseBins =
    locationsQuery.data
      ?.flatMap((zone) => zone.bins)
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>New work order</CardTitle>
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
            <Select
              value={type}
              onValueChange={(value) => setType(value as typeof type)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KITTING">Kitting</SelectItem>
                <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                <SelectItem value="BUNDLING">Bundling</SelectItem>
                <SelectItem value="REPACKAGING">Repackaging</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={targetQty}
              onChange={(event) => setTargetQty(event.target.value)}
              placeholder="Target qty"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Select value={outputProductId} onValueChange={setOutputProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Output product" />
              </SelectTrigger>
              <SelectContent>
                {productsQuery.data?.items.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={inputProductId} onValueChange={setInputProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Input component" />
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
              type="number"
              min={1}
              value={qtyPerUnit}
              onChange={(event) => setQtyPerUnit(event.target.value)}
              placeholder="Qty per unit"
            />
            <Select value={outputBinId} onValueChange={setOutputBinId}>
              <SelectTrigger>
                <SelectValue placeholder="Output bin" />
              </SelectTrigger>
              <SelectContent>
                {warehouseBins.map((bin) => (
                  <SelectItem key={bin.id} value={bin.id}>
                    {bin.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            disabled={
              createWorkOrder.isPending ||
              !merchantId ||
              !warehouseId ||
              !outputProductId ||
              !inputProductId ||
              !outputBinId
            }
            onClick={() =>
              createWorkOrder.mutate({
                merchantId,
                warehouseId,
                type,
                targetQty: Math.max(1, Number(targetQty) || 1),
                outputProductId,
                outputBinId,
                inputLines: [
                  {
                    productId: inputProductId,
                    qtyPerUnit: Math.max(1, Number(qtyPerUnit) || 1),
                  },
                ],
              })
            }
          >
            Create work order
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work order execution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workOrdersQuery.data?.map((workOrder) => (
            <div
              key={workOrder.id}
              className="grid gap-2 rounded-md border p-3 md:grid-cols-5 md:items-center"
            >
              <div className="text-sm">
                <p className="font-medium">{workOrder.woNumber}</p>
                <p className="text-muted-foreground">{workOrder.status}</p>
              </div>
              <div className="text-sm">{workOrder.type}</div>
              <div className="text-sm">
                Target: {workOrder.targetQty}
                {workOrder.outputProduct
                  ? ` | Output: ${workOrder.outputProduct.sku}`
                  : ""}
              </div>
              <Input
                type="number"
                min={1}
                value={
                  completeQtyById[workOrder.id] ?? String(workOrder.targetQty)
                }
                onChange={(event) =>
                  setCompleteQtyById((prev) => ({
                    ...prev,
                    [workOrder.id]: event.target.value,
                  }))
                }
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    workOrder.status !== "PENDING" || startWorkOrder.isPending
                  }
                  onClick={() =>
                    startWorkOrder.mutate({ workOrderId: workOrder.id })
                  }
                >
                  Start
                </Button>
                <Button
                  type="button"
                  disabled={
                    workOrder.status !== "IN_PROGRESS" ||
                    completeWorkOrder.isPending
                  }
                  onClick={() =>
                    completeWorkOrder.mutate({
                      workOrderId: workOrder.id,
                      completedQty: Math.max(
                        1,
                        Number(
                          completeQtyById[workOrder.id] ??
                            String(workOrder.targetQty),
                        ) || 1,
                      ),
                    })
                  }
                >
                  Complete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

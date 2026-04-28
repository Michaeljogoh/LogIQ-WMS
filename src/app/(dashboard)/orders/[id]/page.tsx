"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Page() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const orderQuery = useQuery(trpc.order.getById.queryOptions({ orderId }));
  const createPickList = useMutation(
    trpc.pickList.createForOrder.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.order.getById.queryFilter({ orderId }),
        );
      },
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Order detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {orderQuery.data?.channelOrderId} • {orderQuery.data?.status} •{" "}
            {orderQuery.data?.fulfillmentStatus}
          </p>
          {orderQuery.data?.pickList ? (
            <Link
              href={`/picking/${orderQuery.data.pickList.id}`}
              className="text-primary hover:underline"
            >
              Open pick list
            </Link>
          ) : (
            <Button
              disabled={
                createPickList.isPending ||
                !orderQuery.data?.warehouseId ||
                !orderQuery.data
              }
              onClick={() =>
                createPickList.mutate({
                  orderId,
                  warehouseId: orderQuery.data!.warehouseId!,
                  strategy: "SINGLE",
                })
              }
            >
              Create pick list
            </Button>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Picked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderQuery.data?.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.sku}</TableCell>
                  <TableCell>{line.product.name}</TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell>{line.pickedQty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Shipments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderQuery.data?.shipments.map((shipment) => (
            <Link
              key={shipment.id}
              href={`/shipments/${shipment.id}`}
              className="block text-primary hover:underline"
            >
              {shipment.carrier} {shipment.service} - {shipment.status}
            </Link>
          ))}
          {!orderQuery.data?.shipments.length ? (
            <p className="text-sm text-muted-foreground">No shipments yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

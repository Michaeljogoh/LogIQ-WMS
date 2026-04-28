"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"UNFULFILLED" | "DUE_TODAY" | "ALL">(
    "UNFULFILLED",
  );
  const ordersQuery = useQuery(trpc.order.list.queryOptions({ tab }));
  const [selected, setSelected] = useState<string[]>([]);

  const bulkStatus = useMutation(
    trpc.order.bulkSetStatus.mutationOptions({
      onSuccess: async () => {
        setSelected([]);
        await queryClient.invalidateQueries(
          trpc.order.list.queryFilter({ tab }),
        );
      },
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Orders</CardTitle>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="UNFULFILLED">Unfulfilled</TabsTrigger>
              <TabsTrigger value="DUE_TODAY">Due Today</TabsTrigger>
              <TabsTrigger value="ALL">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!selected.length || bulkStatus.isPending}
              onClick={() =>
                bulkStatus.mutate({ orderIds: selected, status: "ON_HOLD" })
              }
            >
              Hold selected
            </Button>
            <Button
              disabled={!selected.length || bulkStatus.isPending}
              onClick={() =>
                bulkStatus.mutate({ orderIds: selected, status: "PENDING" })
              }
            >
              Unhold selected
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Select</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQuery.data?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.includes(order.id)}
                      onChange={(event) =>
                        setSelected((prev) =>
                          event.target.checked
                            ? [...prev, order.id]
                            : prev.filter((id) => id !== order.id),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>{order.channelOrderId}</TableCell>
                  <TableCell>{order.merchant.name}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>{order.fulfillmentStatus}</TableCell>
                  <TableCell>
                    {order.dueAt ? new Date(order.dueAt).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-primary hover:underline"
                    >
                      Open
                    </Link>
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

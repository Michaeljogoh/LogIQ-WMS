"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("ALL");
  const poQuery = useQuery(
    trpc.purchaseOrder.list.queryOptions({
      status:
        status === "ALL"
          ? undefined
          : (status as
              | "DRAFT"
              | "SENT"
              | "CONFIRMED"
              | "IN_TRANSIT"
              | "PARTIALLY_RECEIVED"
              | "RECEIVED"
              | "CANCELLED"),
    }),
  );
  const updateStatus = useMutation(
    trpc.purchaseOrder.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.purchaseOrder.list.queryFilter(),
        );
      },
    }),
  );

  const nextStatusByCurrent: Record<
    | "DRAFT"
    | "SENT"
    | "CONFIRMED"
    | "IN_TRANSIT"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "CANCELLED",
    "SENT" | "CONFIRMED" | "IN_TRANSIT" | "CANCELLED" | null
  > = {
    DRAFT: "SENT",
    SENT: "CONFIRMED",
    CONFIRMED: "IN_TRANSIT",
    IN_TRANSIT: null,
    PARTIALLY_RECEIVED: null,
    RECEIVED: null,
    CANCELLED: null,
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Purchase orders</CardTitle>
          <div className="w-56">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="IN_TRANSIT">In transit</SelectItem>
                <SelectItem value="PARTIALLY_RECEIVED">
                  Partially received
                </SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Receive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poQuery.data?.map((po) => (
                <TableRow key={po.id}>
                  <TableCell>{po.poNumber}</TableCell>
                  <TableCell>{po.supplier.name}</TableCell>
                  <TableCell>{po.merchant.name}</TableCell>
                  <TableCell>{po.status}</TableCell>
                  <TableCell>
                    {po.expectedDate
                      ? new Date(po.expectedDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {nextStatusByCurrent[po.status] ? (
                      <button
                        type="button"
                        className="text-primary hover:underline disabled:text-muted-foreground"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({
                            poId: po.id,
                            status: nextStatusByCurrent[po.status]!,
                          })
                        }
                      >
                        Mark {nextStatusByCurrent[po.status]}
                      </button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/inbound/purchase-orders/${po.id}/receive`}
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

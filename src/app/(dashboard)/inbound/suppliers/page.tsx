"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
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

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery(trpc.supplier.list.queryOptions());

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("7");

  const createSupplier = useMutation(
    trpc.supplier.create.mutationOptions({
      onSuccess: async () => {
        setName("");
        setEmail("");
        setLeadTimeDays("7");
        await queryClient.invalidateQueries(trpc.supplier.list.queryFilter());
      },
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create supplier</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Supplier name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            placeholder="Email (optional)"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="number"
            min={1}
            max={365}
            placeholder="Lead time (days)"
            value={leadTimeDays}
            onChange={(event) => setLeadTimeDays(event.target.value)}
          />
          <Button
            onClick={() =>
              createSupplier.mutate({
                name,
                email: email.trim() || null,
                leadTimeDays: Math.max(1, Number(leadTimeDays) || 7),
              })
            }
            disabled={!name.trim() || createSupplier.isPending}
          >
            Add supplier
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Lead time</TableHead>
                <TableHead>PO count</TableHead>
                <TableHead>On-time rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliersQuery.data?.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.email ?? "-"}</TableCell>
                  <TableCell>{supplier.leadTimeDays} days</TableCell>
                  <TableCell>{supplier._count.purchaseOrders}</TableCell>
                  <TableCell>
                    {supplier.onTimeRatePct === null
                      ? "-"
                      : `${supplier.onTimeRatePct}%`}
                  </TableCell>
                </TableRow>
              ))}
              {!suppliersQuery.isLoading && !suppliersQuery.data?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No suppliers yet.
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

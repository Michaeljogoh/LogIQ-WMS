"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusBadge(status: string) {
  const variant =
    status === "READY" || status === "PRINTED"
      ? "default"
      : status === "PARTIAL_FAILED"
        ? "destructive"
        : status === "PURCHASING"
          ? "secondary"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function PrintingQueuesPage() {
  const trpc = useTRPC();
  const listQuery = useQuery(trpc.printQueue.list.queryOptions());

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Batch label printing
          </h1>
          <p className="text-sm text-muted-foreground">
            Purchase carrier labels in bulk and send ZPL to thermal printers.
          </p>
        </div>
        <Button asChild>
          <Link href="/printing/new">New print queue</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queues</CardTitle>
          <CardDescription>
            Most recent first. Open a queue to purchase labels, print, or
            download a USPS SCAN form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(listQuery.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    {row.warehouse.code} — {row.warehouse.name}
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell className="text-right">{row.labelCount}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/printing/${row.id}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!listQuery.data?.length && !listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm">
                    No print queues yet.
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

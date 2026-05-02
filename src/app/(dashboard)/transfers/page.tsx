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

function statusBadge(s: string) {
  const variant =
    s === "RECEIVED"
      ? "default"
      : s === "SHIPPED" || s === "PARTIALLY_RECEIVED"
        ? "secondary"
        : s === "CANCELLED"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{s}</Badge>;
}

export default function TransfersPage() {
  const trpc = useTRPC();
  const listQuery = useQuery(trpc.transfer.list.queryOptions());

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Inter-warehouse transfers
          </h1>
          <p className="text-sm text-muted-foreground">
            Move inventory between warehouses with ship / receive tracking.
          </p>
        </div>
        <Button asChild>
          <Link href="/transfers/new">New transfer</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfers</CardTitle>
          <CardDescription>Most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(listQuery.data ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.toNumber}</TableCell>
                  <TableCell className="text-sm">
                    {t.fromWarehouse.code} → {t.toWarehouse.code}
                  </TableCell>
                  <TableCell>{statusBadge(t.status)}</TableCell>
                  <TableCell>{t.lines.length}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/transfers/${t.id}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!listQuery.data?.length && !listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm">
                    No transfers yet.
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

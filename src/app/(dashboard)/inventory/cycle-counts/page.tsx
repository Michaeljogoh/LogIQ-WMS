"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
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
  const trpc = useTRPC();
  const cycleCountsQuery = useQuery(trpc.cycleCount.list.queryOptions({}));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cycle counts</h1>
        <p className="text-sm text-muted-foreground">
          Track count progress and reconcile discrepancies by warehouse.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All cycle counts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycleCountsQuery.data?.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/inventory/cycle-counts/${row.id}`}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.warehouseId}</TableCell>
                  <TableCell>{row._count.lines}</TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "ACTIVE" ? "default" : "outline"}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {cycleCountsQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Loading cycle counts...
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

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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

export default function Page({ params }: Readonly<{ params: { id: string } }>) {
  const trpc = useTRPC();
  const cycleCountQuery = useQuery(
    trpc.cycleCount.getById.queryOptions({ cycleCountId: params.id }),
  );
  const reconcileMutation = useMutation(
    trpc.cycleCount.reconcile.mutationOptions({
      onSuccess: async () => {
        toast.success("Reconciliation applied");
        await cycleCountQuery.refetch();
      },
      onError: () => {
        toast.error("Failed to reconcile cycle count");
      },
    }),
  );

  const discrepancyLines =
    cycleCountQuery.data?.lines.filter(
      (line) =>
        line.countedQty !== null && line.countedQty !== line.expectedQty,
    ) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Reconcile cycle count
        </h1>
        <p className="text-sm text-muted-foreground">
          Review discrepancies and apply inventory adjustments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discrepancy lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Bin</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Counted</TableHead>
                <TableHead className="text-right">Delta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discrepancyLines.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.product.sku}</TableCell>
                  <TableCell>{row.bin.label}</TableCell>
                  <TableCell className="text-right">
                    {row.expectedQty}
                  </TableCell>
                  <TableCell className="text-right">{row.countedQty}</TableCell>
                  <TableCell className="text-right">
                    {(row.countedQty ?? 0) - row.expectedQty}
                  </TableCell>
                </TableRow>
              ))}
              {cycleCountQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Loading discrepancies...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <Button
            className="w-full sm:w-auto"
            disabled={reconcileMutation.isPending}
            onClick={() =>
              reconcileMutation.mutate({ cycleCountId: params.id })
            }
          >
            {reconcileMutation.isPending
              ? "Applying reconciliation..."
              : "Apply reconciliation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

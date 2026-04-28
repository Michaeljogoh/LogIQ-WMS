"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
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
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invoiceQuery = useQuery(
    trpc.invoice.getById.queryOptions({ invoiceId }),
  );
  const invoice = invoiceQuery.data as
    | {
        invoiceNumber?: string;
        status?: string;
        totalCents?: number;
        anomalyFlags?: unknown;
        pdfUrl?: string | null;
        lines?: Array<{
          id: string;
          feeType: string;
          description: string;
          unitCount: number;
          unitRateCents: number;
          totalCents: number;
        }>;
      }
    | undefined;
  const [reason, setReason] = useState("");
  const disputeMutation = useMutation(
    trpc.invoice.dispute.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.invoice.getById.queryFilter({ invoiceId }),
        );
      },
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{invoice?.invoiceNumber ?? "Invoice detail"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>Status: {invoice?.status}</p>
          <p>Total: ${((invoice?.totalCents ?? 0) / 100).toFixed(2)}</p>
          <p>Anomaly flags: {String(invoice?.anomalyFlags ?? "{}")}</p>
          <div className="space-y-1 text-sm">
            <p className="font-medium">Dispute audit trail</p>
            {invoiceQuery.data?.disputes?.length ? (
              invoiceQuery.data.disputes.map((dispute) => (
                <p key={dispute.id}>
                  {new Date(dispute.createdAt).toLocaleString()} - {dispute.status} -{" "}
                  {dispute.reason}
                </p>
              ))
            ) : (
              <p>No disputes logged.</p>
            )}
          </div>
          <p>
            PDF:{" "}
            {invoice?.pdfUrl ? (
              <a href={invoice.pdfUrl} className="text-primary hover:underline">
                Download
              </a>
            ) : (
              "Not generated"
            )}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Line breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fee Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice?.lines?.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.feeType}</TableCell>
                  <TableCell>{line.description}</TableCell>
                  <TableCell>{line.unitCount}</TableCell>
                  <TableCell>
                    ${(line.unitRateCents / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>${(line.totalCents / 100).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dispute invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Dispute reason"
          />
          <Button
            disabled={disputeMutation.isPending || !reason.trim()}
            onClick={() => disputeMutation.mutate({ invoiceId, reason })}
          >
            Submit dispute
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery(trpc.merchant.portalDashboard.queryOptions());
  const merchantId = dashboardQuery.data?.latestInvoice?.merchantId;
  const invoicesQuery = useQuery(
    trpc.invoice.listByMerchant.queryOptions(
      { merchantId: merchantId ?? "" },
      { enabled: Boolean(merchantId) },
    ),
  );
  const [reason, setReason] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const dispute = useMutation(
    trpc.invoice.dispute.mutationOptions({
      onSuccess: async () => {
        setReason("");
        await queryClient.invalidateQueries(
          trpc.invoice.listByMerchant.queryFilter({ merchantId: merchantId ?? "" }),
        );
      },
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {invoicesQuery.data?.map((invoice) => (
            <button
              key={invoice.id}
              type="button"
              className="block text-left hover:underline"
              onClick={() => setInvoiceId(invoice.id)}
            >
              {invoice.invoiceNumber} - ${(invoice.totalCents / 100).toFixed(2)} ({invoice.status})
            </button>
          ))}
          {!invoicesQuery.data?.length ? <p>No invoices available.</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dispute form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} placeholder="Invoice ID" />
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
          <Button
            disabled={dispute.isPending || !invoiceId.trim() || !reason.trim()}
            onClick={() => dispute.mutate({ invoiceId: invoiceId.trim(), reason })}
          >
            Submit dispute
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

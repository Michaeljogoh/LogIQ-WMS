"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const trpc = useTRPC();
  const merchantsQuery = useQuery(trpc.merchant.listWithMetrics.queryOptions());

  return (
    <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
      {merchantsQuery.data?.map((merchant) => (
        <Card key={merchant.id}>
          <CardHeader>
            <CardTitle>{merchant.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Orders: {merchant.orderCount}</p>
            <p>Inventory value: ${(merchant.inventoryValueCents / 100).toFixed(2)}</p>
            <p>SLA score: {merchant.slaScore}%</p>
            <p>
              Last invoice:{" "}
              {merchant.latestInvoice
                ? `${merchant.latestInvoice.invoiceNumber} (${merchant.latestInvoice.status})`
                : "N/A"}
            </p>
            <div className="flex gap-3 pt-2">
              <Link href={`/merchants/${merchant.id}/contract`} className="text-primary hover:underline">
                Contract
              </Link>
              {merchant.latestInvoice ? (
                <Link
                  href={`/merchants/${merchant.id}/invoices/${merchant.latestInvoice.id}`}
                  className="text-primary hover:underline"
                >
                  Invoice
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

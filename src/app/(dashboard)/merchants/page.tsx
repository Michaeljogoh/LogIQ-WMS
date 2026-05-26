"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { CreateMerchantDialog } from "@/components/merchants/create-merchant-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const trpc = useTRPC();
  const merchantsQuery = useQuery(trpc.merchant.listWithMetrics.queryOptions());

  return (
    <div className="space-y-6 p-6">
      <OperatorPageHeader
        description="Client brands you fulfill for. Each merchant gets an owner invite to the portal."
        title="Merchants"
        actions={
          <CreateMerchantDialog
            onSuccess={() => void merchantsQuery.refetch()}
          />
        }
      />

      {merchantsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading merchants…</p>
      ) : null}

      {merchantsQuery.isError ? (
        <p className="text-sm text-destructive">
          {merchantsQuery.error.message}
        </p>
      ) : null}

      {!merchantsQuery.isLoading && (merchantsQuery.data?.length ?? 0) === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No merchants yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add a merchant to create orders, contracts, and portal access for
              their team.
            </p>
          </CardHeader>
          <CardContent>
            <CreateMerchantDialog
              onSuccess={() => void merchantsQuery.refetch()}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {merchantsQuery.data?.map((merchant) => (
          <Card key={merchant.id}>
            <CardHeader>
              <CardTitle>{merchant.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{merchant.email}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Orders: {merchant.orderCount}</p>
              <p>
                Inventory value: $
                {(merchant.inventoryValueCents / 100).toFixed(2)}
              </p>
              <p>SLA score: {merchant.slaScore}%</p>
              <p>
                Last invoice:{" "}
                {merchant.latestInvoice
                  ? `${merchant.latestInvoice.invoiceNumber} (${merchant.latestInvoice.status})`
                  : "N/A"}
              </p>
              <div className="flex gap-3 pt-2">
                <Link
                  className="text-primary hover:underline"
                  href={`/merchants/${merchant.id}/contract`}
                >
                  Contract
                </Link>
                {merchant.latestInvoice ? (
                  <Link
                    className="text-primary hover:underline"
                    href={`/merchants/${merchant.id}/invoices/${merchant.latestInvoice.id}`}
                  >
                    Invoice
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

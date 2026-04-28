"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/app/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MerchantPortalDashboard() {
  const trpc = useTRPC();
  const dashboardQuery = useQuery(trpc.merchant.portalDashboard.queryOptions());

  return (
    <div className="grid gap-4 p-6 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Open Orders</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {dashboardQuery.data?.openOrders ?? 0}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Inventory Health</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {dashboardQuery.data?.lowStockCount ?? 0} low stock
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {dashboardQuery.data?.recentShipments.length ?? 0}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Last Invoice</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {dashboardQuery.data?.latestInvoice
            ? `${dashboardQuery.data.latestInvoice.invoiceNumber} - $${(
                dashboardQuery.data.latestInvoice.totalCents / 100
              ).toFixed(2)}`
            : "No invoice yet"}
        </CardContent>
      </Card>
    </div>
  );
}

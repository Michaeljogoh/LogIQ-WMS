"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/app/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const trpc = useTRPC();
  const poQuery = useQuery(trpc.purchaseOrder.list.queryOptions({}));
  const workOrderQuery = useQuery(
    trpc.workOrder.list.queryOptions({
      status: "PENDING",
    }),
  );

  const openPoCount =
    poQuery.data?.filter(
      (row) => row.status !== "RECEIVED" && row.status !== "CANCELLED",
    ).length ?? 0;
  const expectedThisWeekCount =
    poQuery.data?.filter((row) => {
      if (!row.expectedDate) {
        return false;
      }
      const now = new Date();
      const sevenDaysOut = new Date();
      sevenDaysOut.setDate(now.getDate() + 7);
      const expected = new Date(row.expectedDate);
      return expected >= now && expected <= sevenDaysOut;
    }).length ?? 0;
  const pendingWorkOrders = workOrderQuery.data?.length ?? 0;
  const inTransitPoCount =
    poQuery.data?.filter((row) => row.status === "IN_TRANSIT").length ?? 0;
  const partiallyReceivedPoCount =
    poQuery.data?.filter((row) => row.status === "PARTIALLY_RECEIVED").length ??
    0;

  return (
    <div className="grid gap-4 p-6 md:grid-cols-5">
      <Card>
        <CardHeader>
          <CardTitle>Open purchase orders</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {openPoCount}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Expected this week</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {expectedThisWeekCount}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Work orders pending</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {pendingWorkOrders}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>In transit</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {inTransitPoCount}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Partially received</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {partiallyReceivedPoCount}
        </CardContent>
      </Card>
    </div>
  );
}

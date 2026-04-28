"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Page() {
  const params = useParams<{ id: string }>();
  const shipmentId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const shipmentQuery = useQuery(
    trpc.shipment.getById.queryOptions({ shipmentId }),
  );
  const [status, setStatus] = useState<
    "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "EXCEPTION" | "RETURNED"
  >("IN_TRANSIT");
  const addEvent = useMutation(
    trpc.shipment.addTrackingEvent.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.shipment.getById.queryFilter({ shipmentId }),
        );
      },
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipment timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {shipmentQuery.data?.carrier} {shipmentQuery.data?.service} •{" "}
            {shipmentQuery.data?.trackingNumber}
          </p>
          <div className="flex gap-2">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_TRANSIT">In transit</SelectItem>
                <SelectItem value="OUT_FOR_DELIVERY">
                  Out for delivery
                </SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="EXCEPTION">Exception</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={addEvent.isPending}
              onClick={() => addEvent.mutate({ shipmentId, status })}
            >
              Add event
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {shipmentQuery.data?.trackingEvents.map((event) => (
              <p key={event.id}>
                {new Date(event.eventAt).toLocaleString()} - {event.status}
                {event.description ? ` - ${event.description}` : ""}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

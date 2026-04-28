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
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [weightOz, setWeightOz] = useState("16");
  const [selectedRateId, setSelectedRateId] = useState("");

  const ratesQuery = useQuery(
    trpc.shipment.rateShop.queryOptions(
      { orderId, weightOz: Math.max(1, Number(weightOz) || 1) },
      { enabled: Boolean(orderId) },
    ),
  );

  const buyLabel = useMutation(
    trpc.shipment.buyLabel.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.order.getById.queryFilter({ orderId }),
        );
      },
    }),
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Packing Station</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            className="h-11"
            type="number"
            min={1}
            value={weightOz}
            onChange={(event) => setWeightOz(event.target.value)}
            placeholder="Shipment weight (oz)"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Select</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Transit</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratesQuery.data?.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <input
                      type="radio"
                      checked={selectedRateId === rate.id}
                      onChange={() => setSelectedRateId(rate.id)}
                    />
                  </TableCell>
                  <TableCell>{rate.carrier}</TableCell>
                  <TableCell>{rate.service}</TableCell>
                  <TableCell>{rate.estimatedDays} days</TableCell>
                  <TableCell>${(rate.rateCents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    {rate.isCheapest ? "Cheapest " : ""}
                    {rate.isFastest ? "Fastest " : ""}
                    {rate.logiqRecommended ? "LogIQ Recommended" : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            className="h-11 min-w-44"
            disabled={buyLabel.isPending || !selectedRateId}
            onClick={() =>
              buyLabel.mutate({
                orderId,
                rateId: selectedRateId,
                weightOz: Math.max(1, Number(weightOz) || 1),
              })
            }
          >
            Buy label
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

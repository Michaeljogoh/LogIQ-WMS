"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Disposition = "RESTOCK" | "DISPOSE";
type Condition = "NEW" | "OPEN_BOX" | "DAMAGED";

export default function Page() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const trpc = useTRPC();
  const orderQuery = useQuery(trpc.order.getById.queryOptions({ orderId }));
  const [conditions, setConditions] = useState<Record<string, Condition>>({});
  const [dispositions, setDispositions] = useState<Record<string, Disposition>>(
    {},
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Returns / RMA workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orderQuery.data?.lines.map((line) => (
            <div
              key={line.id}
              className="grid gap-2 rounded-md border p-3 md:grid-cols-4"
            >
              <p className="text-sm font-medium">{line.sku}</p>
              <Select
                value={conditions[line.id] ?? "NEW"}
                onValueChange={(value) =>
                  setConditions((prev) => ({
                    ...prev,
                    [line.id]: value as Condition,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="OPEN_BOX">Open box</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={dispositions[line.id] ?? "RESTOCK"}
                onValueChange={(value) =>
                  setDispositions((prev) => ({
                    ...prev,
                    [line.id]: value as Disposition,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTOCK">Restock</SelectItem>
                  <SelectItem value="DISPOSE">Dispose</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Qty: {line.quantity} | Picked: {line.pickedQty}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

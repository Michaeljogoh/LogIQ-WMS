"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Page({ params }: Readonly<{ params: { id: string } }>) {
  const trpc = useTRPC();
  const [countedValues, setCountedValues] = useState<Record<string, string>>(
    {},
  );
  const cycleCountQuery = useQuery(
    trpc.cycleCount.getById.queryOptions({ cycleCountId: params.id }),
  );
  const submitScanMutation = useMutation(
    trpc.cycleCount.submitScan.mutationOptions({
      onSuccess: async () => {
        toast.success("Count submitted");
        await cycleCountQuery.refetch();
      },
      onError: () => {
        toast.error("Failed to submit count");
      },
    }),
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cycle count scan
        </h1>
        <p className="text-sm text-muted-foreground">
          Tablet-friendly scan flow for floor staff.
        </p>
      </div>

      <div className="grid gap-3">
        {cycleCountQuery.data?.lines.map((line) => (
          <Card key={line.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {line.product.sku} · {line.bin.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Expected: {line.expectedQty}
              </p>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                className="h-11 text-base"
                placeholder="Enter counted quantity"
                value={countedValues[line.id] ?? ""}
                onChange={(event) =>
                  setCountedValues((prev) => ({
                    ...prev,
                    [line.id]: event.target.value,
                  }))
                }
              />
              <Button
                size="lg"
                className="h-11 w-full text-base"
                disabled={submitScanMutation.isPending}
                onClick={() => {
                  const value = countedValues[line.id];
                  if (!value || Number.isNaN(Number(value))) {
                    toast.error("Enter a valid counted quantity");
                    return;
                  }
                  submitScanMutation.mutate({
                    cycleCountLineId: line.id,
                    countedQty: Number.parseInt(value, 10),
                  });
                }}
              >
                Submit count
              </Button>
            </CardContent>
          </Card>
        ))}
        {cycleCountQuery.isLoading ? (
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Loading count lines...
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

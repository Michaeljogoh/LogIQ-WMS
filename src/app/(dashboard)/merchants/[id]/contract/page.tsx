"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Page() {
  const params = useParams<{ id: string }>();
  const merchantId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const contractQuery = useQuery(trpc.merchant.getContract.queryOptions({ merchantId }));
  const [paymentPeriod, setPaymentPeriod] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("MONTHLY");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [rateCents, setRateCents] = useState("100");
  const [unitLabel, setUnitLabel] = useState("unit");
  const upsertContract = useMutation(
    trpc.merchant.upsertContract.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.merchant.getContract.queryFilter({ merchantId }),
        );
      },
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Merchant contract</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={paymentPeriod} onValueChange={(value) => setPaymentPeriod(value as typeof paymentPeriod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input
            type="number"
            min={0}
            value={rateCents}
            onChange={(e) => setRateCents(e.target.value)}
            placeholder="Rate cents"
          />
          <Input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="Unit label" />
          <Button
            disabled={upsertContract.isPending || !startDate}
            onClick={() =>
              upsertContract.mutate({
                merchantId,
                paymentPeriod,
                currency,
                startDate: new Date(startDate),
                isActive: true,
                feeRules: [
                  {
                    feeType: "PACKING_PER_SHIPMENT",
                    rateCents: Math.max(0, Number(rateCents) || 0),
                    unitLabel: unitLabel || "unit",
                    includedUnits: 0,
                  },
                ],
                slaRules: [
                  {
                    metric: "FULFILLMENT_TAT",
                    thresholdMins: 24 * 60,
                    warningPct: 90,
                    isActive: true,
                  },
                ],
              })
            }
          >
            Save contract
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Current rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {contractQuery.data?.feeRules.map((rule) => (
            <p key={rule.id}>
              {rule.feeType}: ${(rule.rateCents / 100).toFixed(2)} / {rule.unitLabel}
            </p>
          ))}
          {!contractQuery.data?.feeRules.length ? <p>No fee rules configured.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

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
  const poId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const poQuery = useQuery(trpc.purchaseOrder.getById.queryOptions({ poId }));
  const [lineId, setLineId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState("1");
  const [binId, setBinId] = useState("");
  const [override, setOverride] = useState(false);
  const [asnNumber, setAsnNumber] = useState("");
  const [asnDate, setAsnDate] = useState("");

  const selectedLine = poQuery.data?.lines.find((line) => line.id === lineId);
  const suggestionsQuery = useQuery(
    trpc.purchaseOrder.getPutawaySuggestions.queryOptions(
      {
        poId,
        productId: selectedLine?.productId ?? "",
      },
      {
        enabled: Boolean(selectedLine?.productId),
      },
    ),
  );

  const receiveMutation = useMutation(
    trpc.purchaseOrder.receiveScan.mutationOptions({
      onSuccess: async () => {
        setQty("1");
        await queryClient.invalidateQueries(
          trpc.purchaseOrder.getById.queryFilter({ poId }),
        );
      },
    }),
  );
  const createAsn = useMutation(
    trpc.purchaseOrder.createAsn.mutationOptions({
      onSuccess: async () => {
        setAsnNumber("");
        setAsnDate("");
        await queryClient.invalidateQueries(
          trpc.purchaseOrder.getById.queryFilter({ poId }),
        );
      },
    }),
  );

  const scannedQty = Math.max(1, Number(qty) || 1);
  const selectedLineThreshold = selectedLine
    ? Math.floor(selectedLine.orderedQty * 1.1)
    : null;
  const willExceedThreshold =
    selectedLine !== undefined &&
    selectedLineThreshold !== null &&
    selectedLine.receivedQty + scannedQty > selectedLineThreshold;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">ASN support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              className="h-11"
              placeholder="ASN number"
              value={asnNumber}
              onChange={(event) => setAsnNumber(event.target.value)}
            />
            <Input
              className="h-11"
              type="date"
              value={asnDate}
              onChange={(event) => setAsnDate(event.target.value)}
            />
            <Button
              className="h-11"
              disabled={!asnNumber.trim() || createAsn.isPending}
              onClick={() =>
                createAsn.mutate({
                  poId,
                  asnNumber: asnNumber.trim(),
                  expectedArrivalDate: asnDate ? new Date(asnDate) : null,
                })
              }
            >
              Add ASN
            </Button>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {poQuery.data?.asns.length ? (
              poQuery.data.asns.map((asn) => (
                <p key={asn.id}>
                  {asn.asnNumber} - {asn.status}
                  {asn.expectedArrivalDate
                    ? ` (${new Date(asn.expectedArrivalDate).toLocaleDateString()})`
                    : ""}
                </p>
              ))
            ) : (
              <p>No ASNs yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            Receive {poQuery.data?.poNumber ?? "Purchase Order"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={lineId} onValueChange={setLineId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select PO line" />
              </SelectTrigger>
              <SelectContent>
                {poQuery.data?.lines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.product.sku} ({line.receivedQty}/{line.orderedQty})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="h-11"
              placeholder="Scan barcode or SKU"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
            />

            <Input
              className="h-11"
              type="number"
              min={1}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              placeholder="Scanned qty"
            />

            <Select value={binId} onValueChange={setBinId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Putaway bin" />
              </SelectTrigger>
              <SelectContent>
                {suggestionsQuery.data?.map((bin) => (
                  <SelectItem key={bin.id} value={bin.id}>
                    {bin.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={override}
              onChange={(event) => setOverride(event.target.checked)}
            />
            Allow over-receive override
          </label>

          <Button
            className="h-11 min-w-44"
            disabled={
              receiveMutation.isPending ||
              !binId ||
              (!lineId && !barcode.trim())
            }
            onClick={() => {
              if (willExceedThreshold && !override) {
                const confirmed = window.confirm(
                  "This scan exceeds the 10% over-receive threshold. Continue with override?",
                );
                if (!confirmed) {
                  return;
                }
              }
              receiveMutation.mutate({
                poId,
                poLineId: lineId || undefined,
                scannedBarcode: barcode.trim() || undefined,
                scannedQty,
                putawayBinId: binId,
                overrideOverReceive: override || willExceedThreshold,
              });
            }}
          >
            Scan receive
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

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
  const pickListId = params.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const pickListQuery = useQuery(
    trpc.pickList.getById.queryOptions({ pickListId }),
  );
  const [itemId, setItemId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState("1");
  const [override, setOverride] = useState(false);
  const [auditNote, setAuditNote] = useState("");
  const scanMutation = useMutation(
    trpc.pickList.scan.mutationOptions({
      onSuccess: async () => {
        setQty("1");
        await queryClient.invalidateQueries(
          trpc.pickList.getById.queryFilter({ pickListId }),
        );
      },
    }),
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Picking Scan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select pick item" />
            </SelectTrigger>
            <SelectContent>
              {pickListQuery.data?.items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.product.sku} • Bin {item.binLabel} ({item.pickedQty}/
                  {item.requiredQty})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-11"
            placeholder="Scan barcode"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
          />
          <Input
            className="h-11"
            type="number"
            min={1}
            value={qty}
            onChange={(event) => setQty(event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={override}
              onChange={(event) => setOverride(event.target.checked)}
            />
            Override mismatch
          </label>
          {override ? (
            <Input
              className="h-11"
              placeholder="Audit note"
              value={auditNote}
              onChange={(event) => setAuditNote(event.target.value)}
            />
          ) : null}
          <Button
            className="h-11 min-w-44"
            disabled={scanMutation.isPending || !itemId || !barcode.trim()}
            onClick={() =>
              scanMutation.mutate({
                pickListItemId: itemId,
                scannedBarcode: barcode.trim(),
                qty: Math.max(1, Number(qty) || 1),
                overrideMismatch: override,
                auditNote: override ? auditNote.trim() : undefined,
              })
            }
          >
            Confirm pick
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

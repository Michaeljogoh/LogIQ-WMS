"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const ACTIONS = [
  "ASSIGN_TO_WAREHOUSE",
  "ASSIGN_NEAREST",
  "SPLIT_SHIPMENT",
  "HOLD_FOR_STOCK",
] as const;

/** Narrow TRPC output so TS does not recurse on Prisma include types. */
type RoutingRuleListItem = {
  id: string;
  name: string;
  priority: number;
  merchantId: string | null;
  warehouseId: string | null;
  action: string;
  conditions: unknown;
  isActive: boolean;
  merchant: { id: string; name: string } | null;
  warehouse: { id: string; name: string; code: string } | null;
};

export default function RoutingSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const rulesQuery = useQuery(trpc.routing.rules.list.queryOptions());
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const merchantsQuery = useQuery(trpc.merchant.list.queryOptions());

  const reorder = useMutation(
    trpc.routing.rules.reorder.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.routing.rules.list.queryFilter(),
        );
      },
    }),
  );

  const upsert = useMutation(
    trpc.routing.rules.upsert.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.routing.rules.list.queryFilter(),
        );
        setOpen(false);
      },
    }),
  );

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(0);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [action, setAction] = useState<(typeof ACTIONS)[number]>(
    "ASSIGN_NEAREST",
  );
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [conditionsJson, setConditionsJson] = useState("[]");
  const [isActive, setIsActive] = useState(true);

  const orderedRules = useMemo(
    () => (rulesQuery.data ?? []) as RoutingRuleListItem[],
    [rulesQuery.data],
  );

  const resetForm = () => {
    setEditingId(undefined);
    setName("");
    setPriority(0);
    setMerchantId(null);
    setAction("ASSIGN_NEAREST");
    setWarehouseId(null);
    setConditionsJson("[]");
    setIsActive(true);
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const r = orderedRules.find((x) => x.id === id);
    if (!r) {
      return;
    }
    setEditingId(r.id);
    setName(r.name);
    setPriority(r.priority);
    setMerchantId(r.merchantId);
    setAction(r.action as (typeof ACTIONS)[number]);
    setWarehouseId(r.warehouseId);
    setConditionsJson(JSON.stringify(r.conditions ?? [], null, 2));
    setIsActive(r.isActive);
    setOpen(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= orderedRules.length) {
      return;
    }
    const ids = orderedRules.map((r) => r.id);
    const a = ids[index];
    const b = ids[next];
    if (a === undefined || b === undefined) {
      return;
    }
    ids[index] = b;
    ids[next] = a;
    reorder.mutate({ orderedRuleIds: ids });
  };

  const onSave = () => {
    let conditions: unknown;
    try {
      conditions = JSON.parse(conditionsJson) as unknown;
    } catch {
      window.alert("Conditions must be valid JSON.");
      return;
    }
    upsert.mutate({
      id: editingId,
      name,
      priority,
      merchantId,
      conditions,
      action,
      warehouseId:
        action === "ASSIGN_TO_WAREHOUSE" ? warehouseId : null,
      isActive,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Order routing rules
        </h1>
        <p className="text-sm text-muted-foreground">
          Higher priority runs first. Uses destination ZIP proximity (Haversine
          via US ZIP centroids) when assigning nearest warehouse.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Rules</CardTitle>
            <CardDescription>
              Example condition:{" "}
              <code className="text-xs">
                [{`{ "field": "destinationState", "operator": "eq", "value": "CA" }`}]
              </code>
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => {
              openNew();
              setOpen(true);
            }}
          >
            Add rule
          </Button>
          <Sheet
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) {
                resetForm();
              }
            }}
          >
            <SheetContent className="overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>
                  {editingId ? "Edit rule" : "New rule"}
                </SheetTitle>
                <SheetDescription>
                  ASSIGN_TO_WAREHOUSE requires a target warehouse.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 px-1">
                <div className="space-y-2">
                  <Label htmlFor="nm">Name</Label>
                  <Input
                    id="nm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pr">Priority (higher evaluates first)</Label>
                  <Input
                    id="pr"
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Merchant scope</Label>
                  <Select
                    value={merchantId ?? "__all__"}
                    onValueChange={(v) =>
                      setMerchantId(v === "__all__" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All merchants" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All merchants</SelectItem>
                      {(merchantsQuery.data ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={action}
                    onValueChange={(v) => setAction(v as (typeof ACTIONS)[number])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {action === "ASSIGN_TO_WAREHOUSE" ? (
                  <div className="space-y-2">
                    <Label>Warehouse</Label>
                    <Select
                      value={warehouseId ?? ""}
                      onValueChange={(v) => setWarehouseId(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {(warehousesQuery.data ?? []).map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.code} — {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="cj">Conditions (JSON array)</Label>
                  <Textarea
                    id="cj"
                    className="font-mono text-xs min-h-[120px]"
                    value={conditionsJson}
                    onChange={(e) => setConditionsJson(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="act"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4"
                  />
                  <Label htmlFor="act">Active</Label>
                </div>
                <Button
                  type="button"
                  disabled={upsert.isPending || !name.trim()}
                  onClick={onSave}
                >
                  Save
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Order</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRules.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8"
                        disabled={
                          index === orderedRules.length - 1 || reorder.isPending
                        }
                        onClick={() => move(index, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.merchant?.name ?? "All"}
                  </TableCell>
                  <TableCell>{r.isActive ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(r.id)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!orderedRules.length && !rulesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm">
                    No rules yet. Add a rule or run routing from an order with
                    defaults (nearest warehouse with stock).
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

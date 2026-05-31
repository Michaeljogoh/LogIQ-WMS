"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import type { SessionUser } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOperatorRole } from "@/hooks/use-operator-role";

export type WarehouseStaffPermissionMode = "full" | "pickReceive";

type WarehouseStaffAssignmentFormProps = Readonly<{
  accountUserId: string;
  staffEmail: string;
  permissionMode?: WarehouseStaffPermissionMode;
}>;

export function WarehouseStaffAssignmentForm({
  accountUserId,
  staffEmail,
  permissionMode = "pickReceive",
}: WarehouseStaffAssignmentFormProps) {
  const trpc = useTRPC();
  const { isAccountOwner } = useOperatorRole();
  const session = authClient.useSession();
  const managedWarehouseIds =
    (session.data?.user as SessionUser | undefined)?.managedWarehouseIds ?? [];

  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const assignmentsQuery = useQuery(
    trpc.warehouseStaff.listForUser.queryOptions({ accountUserId }),
  );

  const assignMutation = useMutation(
    trpc.warehouseStaff.assign.mutationOptions({
      onSuccess: () => {
        toast.success("Assignment saved");
        void assignmentsQuery.refetch();
        setSelectedWarehouse("");
        setPick(false);
        setPack(false);
        setReceive(false);
      },
      onError: (e) => toast.error(e.message ?? "Update failed"),
    }),
  );

  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [pick, setPick] = useState(false);
  const [pack, setPack] = useState(false);
  const [receive, setReceive] = useState(false);

  const assignableWarehouses = useMemo(() => {
    const all = warehousesQuery.data ?? [];
    if (isAccountOwner) {
      return all;
    }
    return all.filter((w) => managedWarehouseIds.includes(w.id));
  }, [warehousesQuery.data, isAccountOwner, managedWarehouseIds]);

  const permissions = useMemo(() => {
    const p: ("PICK" | "PACK" | "RECEIVE")[] = [];
    if (pick) {
      p.push("PICK");
    }
    if (pack && permissionMode === "full") {
      p.push("PACK");
    }
    if (receive) {
      p.push("RECEIVE");
    }
    return p;
  }, [pick, pack, receive, permissionMode]);

  const loadAssignmentIntoForm = (warehouseId: string) => {
    const row = assignmentsQuery.data?.find((a) => a.warehouseId === warehouseId);
    setSelectedWarehouse(warehouseId);
    setPick(row?.permissions.includes("PICK") ?? false);
    setPack(row?.permissions.includes("PACK") ?? false);
    setReceive(row?.permissions.includes("RECEIVE") ?? false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Warehouse permissions</CardTitle>
        <CardDescription>
          {permissionMode === "pickReceive"
            ? `Assign ${staffEmail} to pick or receive at a warehouse you manage.`
            : `Grant ${staffEmail} pick, pack, or receive access per warehouse.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Warehouse</Label>
          <Select
            onValueChange={(value) => loadAssignmentIntoForm(value)}
            value={selectedWarehouse}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {assignableWarehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={pick}
              id="perm-pick"
              onCheckedChange={(v) => setPick(Boolean(v))}
            />
            <Label className="font-normal" htmlFor="perm-pick">
              Pick
            </Label>
          </div>
          {permissionMode === "full" ? (
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={pack}
                id="perm-pack"
                onCheckedChange={(v) => setPack(Boolean(v))}
              />
              <Label className="font-normal" htmlFor="perm-pack">
                Pack
              </Label>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={receive}
              id="perm-receive"
              onCheckedChange={(v) => setReceive(Boolean(v))}
            />
            <Label className="font-normal" htmlFor="perm-receive">
              Receive
            </Label>
          </div>
        </div>

        <Button
          disabled={
            !selectedWarehouse ||
            permissions.length === 0 ||
            assignMutation.isPending
          }
          onClick={() => {
            assignMutation.mutate({
              accountUserId,
              warehouseId: selectedWarehouse,
              permissions,
            });
          }}
          type="button"
        >
          Save assignment
        </Button>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Current assignments</p>
          {assignmentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {(assignmentsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No warehouse assignments yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {assignmentsQuery.data?.map((a) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                  key={a.id}
                >
                  <span>
                    <span className="font-medium">{a.warehouseName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {a.permissions.join(", ")}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => loadAssignmentIntoForm(a.warehouseId)}
                  >
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

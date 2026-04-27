"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
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

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

export default function Page(props: PageProps) {
  const { id: accountUserId } = use(props.params);
  const trpc = useTRPC();

  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());

  const assignmentsQuery = useQuery(
    trpc.warehouseStaff.listForUser.queryOptions({ accountUserId }),
  );

  const assignMutation = useMutation(
    trpc.warehouseStaff.assign.mutationOptions({
      onSuccess: () => {
        toast.success("Assignment saved");
        void assignmentsQuery.refetch();
      },
      onError: (e) => toast.error(e.message ?? "Update failed"),
    }),
  );

  const staffTarget = useQuery({
    ...trpc.accountUser.list.queryOptions(),
    select: (rows) => rows.find((r) => r.id === accountUserId),
  });

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [pick, setPick] = useState(true);
  const [pack, setPack] = useState(false);
  const [receive, setReceive] = useState(false);

  const permissions = useMemo(() => {
    const p: ("PICK" | "PACK" | "RECEIVE")[] = [];
    if (pick) {
      p.push("PICK");
    }
    if (pack) {
      p.push("PACK");
    }
    if (receive) {
      p.push("RECEIVE");
    }
    return p;
  }, [pick, pack, receive]);

  const isStaff = staffTarget.data?.systemRole === "WAREHOUSE_STAFF";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Warehouse access
          </h1>
          <p className="text-sm text-muted-foreground">
            {staffTarget.data?.email ?? "User"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings/users">Back</Link>
        </Button>
      </div>

      {!isStaff ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No floor assignment</CardTitle>
            <CardDescription>
              Warehouse PICK/PACK/RECEIVE scopes apply to users with the
              WAREHOUSE_STAFF system role. Organisation roles are managed via
              membership.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignments</CardTitle>
            <CardDescription>
              Grant this staff member permissions per warehouse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select
                onValueChange={setSelectedWarehouse}
                value={selectedWarehouse}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehousesQuery.data?.map((w) => (
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
              <p className="text-sm font-medium">Current</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {assignmentsQuery.data?.map((a) => (
                  <li key={a.id}>
                    {a.warehouseName}: {a.permissions.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

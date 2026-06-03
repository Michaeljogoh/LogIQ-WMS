"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PlatformOpenAccountButton } from "@/components/platform/platform-account-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OperatorRow = {
  kind: "operator";
  id: string;
  email: string;
  displayName: string;
  roleLabel: string;
  systemRole: string;
  isActive: boolean;
  accountId: string;
  accountName: string;
  firstName: string | null;
  lastName: string | null;
  warehouseAssignmentCount: number;
};

type MerchantRow = {
  kind: "merchant";
  id: string;
  email: string;
  displayName: string;
  roleLabel: string;
  systemRole: string;
  isActive: boolean;
  accountId: string;
  accountName: string;
  merchantName: string;
  hasSignedIn: boolean;
};

const SEARCH_DEBOUNCE_MS = 300;

type OperatorSort = "default" | "sites-desc" | "sites-asc";

function sortOperators(rows: OperatorRow[], sort: OperatorSort): OperatorRow[] {
  if (sort === "default") {
    return rows;
  }
  return [...rows].sort((a, b) => {
    const diff = a.warehouseAssignmentCount - b.warehouseAssignmentCount;
    return sort === "sites-desc" ? -diff : diff;
  });
}

export function PlatformUserAccessPanel() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [operatorSort, setOperatorSort] = useState<OperatorSort>("default");
  const [editOperator, setEditOperator] = useState<OperatorRow | null>(null);
  const [editMerchant, setEditMerchant] = useState<MerchantRow | null>(null);

  const warehousesQuery = useQuery(trpc.platform.listWarehouses.queryOptions());

  const usersQuery = useQuery(
    trpc.platform.listUsers.queryOptions({
      kind: "all",
      search: debouncedSearch.trim() || undefined,
      warehouseId: warehouseId === "all" ? undefined : warehouseId,
    }),
  );

  const invalidateUsers = async () => {
    await qc.invalidateQueries(trpc.platform.listUsers.queryFilter());
  };

  const setActiveMut = useMutation(
    trpc.platform.setUserActive.mutationOptions({
      onSuccess: async (_data, variables) => {
        toast.success(
          variables.isActive ? "User activated" : "User deactivated",
        );
        await invalidateUsers();
      },
      onError: (e) => toast.error(e.message ?? "Update failed"),
    }),
  );

  const updateOperatorMut = useMutation(
    trpc.platform.updateOperator.mutationOptions({
      onSuccess: async () => {
        toast.success("Operator updated");
        setEditOperator(null);
        await invalidateUsers();
      },
      onError: (e) => toast.error(e.message ?? "Update failed"),
    }),
  );

  const updateMerchantMut = useMutation(
    trpc.platform.updateMerchantUser.mutationOptions({
      onSuccess: async () => {
        toast.success("Merchant user updated");
        setEditMerchant(null);
        await invalidateUsers();
      },
      onError: (e) => toast.error(e.message ?? "Update failed"),
    }),
  );

  const operators = useMemo(
    () => sortOperators(usersQuery.data?.operators ?? [], operatorSort),
    [usersQuery.data?.operators, operatorSort],
  );
  const merchants = usersQuery.data?.merchants ?? [];

  const inactiveCount = useMemo(
    () =>
      operators.filter((u) => !u.isActive).length +
      merchants.filter((u) => !u.isActive).length,
    [operators, merchants],
  );

  const handleToggleActive = (
    kind: "operator" | "merchant",
    id: string,
    isActive: boolean,
  ) => {
    setActiveMut.mutate({ kind, id, isActive });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User access control</CardTitle>
          <CardDescription>
            Deactivate operators and merchant users across all tenant accounts.
            Inactive users are signed out immediately and cannot use the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1 space-y-1">
              <Label htmlFor="user-search">Search</Label>
              <Input
                id="user-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email or name…"
                value={search}
              />
            </div>
            <div className="min-w-[220px] space-y-1">
              <Label htmlFor="warehouse-filter">Warehouse</Label>
              <Select
                onValueChange={setWarehouseId}
                value={warehouseId}
              >
                <SelectTrigger id="warehouse-filter">
                  <SelectValue placeholder="All warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses</SelectItem>
                  {(warehousesQuery.data ?? []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px] space-y-1">
              <Label htmlFor="operator-sort">Sort operators</Label>
              <Select
                onValueChange={(v) => setOperatorSort(v as OperatorSort)}
                value={operatorSort}
              >
                <SelectTrigger id="operator-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Account, then email</SelectItem>
                  <SelectItem value="sites-desc">Most sites first</SelectItem>
                  <SelectItem value="sites-asc">Fewest sites first</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inactiveCount > 0 ? (
              <Badge variant="secondary">{inactiveCount} inactive</Badge>
            ) : null}
          </div>

          <Tabs defaultValue="operators">
            <TabsList>
              <TabsTrigger value="operators">
                Operators ({operators.length})
              </TabsTrigger>
              <TabsTrigger value="merchants">
                Merchants ({merchants.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4" value="operators">
              <UserTable
                emptyMessage="No operator users found."
                isLoading={usersQuery.isLoading}
                rows={operators}
                onConfigure={(row) => setEditOperator(row)}
                onToggle={(row, active) =>
                  handleToggleActive("operator", row.id, active)
                }
                renderCells={(row) => (
                  <>
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.roleLabel}</Badge>
                    </TableCell>
                    <TableCell>{row.accountName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.warehouseAssignmentCount} site
                      {row.warehouseAssignmentCount === 1 ? "" : "s"}
                    </TableCell>
                  </>
                )}
              />
            </TabsContent>

            <TabsContent className="mt-4" value="merchants">
              <UserTable
                emptyMessage="No merchant portal users found."
                isLoading={usersQuery.isLoading}
                rows={merchants}
                onConfigure={(row) => setEditMerchant(row)}
                onToggle={(row, active) =>
                  handleToggleActive("merchant", row.id, active)
                }
                renderCells={(row) => (
                  <>
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.roleLabel}</Badge>
                    </TableCell>
                    <TableCell>{row.merchantName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.accountName}
                      {row.hasSignedIn ? "" : " · invite pending"}
                    </TableCell>
                  </>
                )}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EditOperatorDialog
        onOpenChange={(open) => {
          if (!open) {
            setEditOperator(null);
          }
        }}
        onSave={(values) => {
          if (!editOperator) {
            return;
          }
          updateOperatorMut.mutate({
            accountUserId: editOperator.id,
            ...values,
          });
        }}
        open={Boolean(editOperator)}
        operator={editOperator}
        pending={updateOperatorMut.isPending}
      />

      <EditMerchantDialog
        merchant={editMerchant}
        onOpenChange={(open) => {
          if (!open) {
            setEditMerchant(null);
          }
        }}
        onSave={(systemRole) => {
          if (!editMerchant) {
            return;
          }
          updateMerchantMut.mutate({
            merchantUserId: editMerchant.id,
            systemRole,
          });
        }}
        open={Boolean(editMerchant)}
        pending={updateMerchantMut.isPending}
      />
    </div>
  );
}

function UserTable<T extends { id: string; isActive: boolean }>({
  rows,
  isLoading,
  emptyMessage,
  renderCells,
  onToggle,
  onConfigure,
}: {
  rows: T[];
  isLoading: boolean;
  emptyMessage: string;
  renderCells: (row: T) => React.ReactNode;
  onToggle: (row: T, active: boolean) => void;
  onConfigure: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Context</TableHead>
            <TableHead>Sites</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell className="text-muted-foreground" colSpan={6}>
                Loading…
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => (
            <TableRow key={row.id}>
              {renderCells(row)}
              <TableCell>
                <Switch
                  checked={row.isActive}
                  onCheckedChange={(checked) => onToggle(row, checked)}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  onClick={() => onConfigure(row)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Configure
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-center text-sm text-muted-foreground"
                colSpan={6}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function EditOperatorDialog({
  operator,
  open,
  onOpenChange,
  onSave,
  pending,
}: {
  operator: OperatorRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: {
    systemRole: "THREEPL_ACCOUNT_OWNER" | "WAREHOUSE_MANAGER" | "WAREHOUSE_STAFF";
    firstName: string;
    lastName?: string;
  }) => void;
  pending: boolean;
}) {
  const [role, setRole] = useState<
    "THREEPL_ACCOUNT_OWNER" | "WAREHOUSE_MANAGER" | "WAREHOUSE_STAFF"
  >("WAREHOUSE_STAFF");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const operatorId = operator?.id;
  const operatorRole = operator?.systemRole;
  const operatorFirstName = operator?.firstName;
  const operatorLastName = operator?.lastName;

  useEffect(() => {
    if (!operator) {
      return;
    }
    setRole(
      operator.systemRole as
        | "THREEPL_ACCOUNT_OWNER"
        | "WAREHOUSE_MANAGER"
        | "WAREHOUSE_STAFF",
    );
    setFirstName(operator.firstName ?? "");
    setLastName(operator.lastName ?? "");
  }, [operatorId, operatorRole, operatorFirstName, operatorLastName]);

  if (!operator) {
    return null;
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configure operator</SheetTitle>
          <SheetDescription>
            {operator.email} · {operator.accountName}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              onValueChange={(v) =>
                setRole(
                  v as
                    | "THREEPL_ACCOUNT_OWNER"
                    | "WAREHOUSE_MANAGER"
                    | "WAREHOUSE_STAFF",
                )
              }
              value={role}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="THREEPL_ACCOUNT_OWNER">
                  3PL Account Owner
                </SelectItem>
                <SelectItem value="WAREHOUSE_MANAGER">
                  Warehouse Manager
                </SelectItem>
                <SelectItem value="WAREHOUSE_STAFF">Warehouse Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-first">First name</Label>
            <Input
              id="op-first"
              onChange={(e) => setFirstName(e.target.value)}
              value={firstName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-last">Last name</Label>
            <Input
              id="op-last"
              onChange={(e) => setLastName(e.target.value)}
              value={lastName}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <PlatformOpenAccountButton
              accountId={operator.accountId}
              accountName={operator.accountName}
              label="Support access"
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            disabled={pending || !firstName.trim()}
            onClick={() =>
              onSave({
                systemRole: role,
                firstName: firstName.trim(),
                lastName: lastName.trim() || undefined,
              })
            }
            type="button"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EditMerchantDialog({
  merchant,
  open,
  onOpenChange,
  onSave,
  pending,
}: {
  merchant: MerchantRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (role: "MERCHANT_OWNER" | "MERCHANT_USER") => void;
  pending: boolean;
}) {
  const [role, setRole] = useState<"MERCHANT_OWNER" | "MERCHANT_USER">(
    "MERCHANT_USER",
  );

  const merchantId = merchant?.id;
  const merchantRole = merchant?.systemRole;

  useEffect(() => {
    if (!merchant) {
      return;
    }
    setRole(
      merchant.systemRole as "MERCHANT_OWNER" | "MERCHANT_USER",
    );
  }, [merchantId, merchantRole]);

  if (!merchant) {
    return null;
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configure merchant user</SheetTitle>
          <SheetDescription>
            {merchant.email} · {merchant.merchantName}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <Label>Portal role</Label>
            <Select
              onValueChange={(v) =>
                setRole(v as "MERCHANT_OWNER" | "MERCHANT_USER")
              }
              value={role}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MERCHANT_OWNER">Merchant Owner</SelectItem>
                <SelectItem value="MERCHANT_USER">Merchant User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button
            disabled={pending}
            onClick={() => onSave(role)}
            type="button"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Truck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsFilterBar,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery(trpc.supplier.list.queryOptions());
  const suppliers = suppliersQuery.data ?? [];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("7");

  const stats = useMemo(() => {
    const totalPos = suppliers.reduce(
      (sum, s) => sum + s._count.purchaseOrders,
      0,
    );
    const withRate = suppliers.filter((s) => s.onTimeRatePct !== null);
    const avgOnTime =
      withRate.length > 0
        ? Math.round(
            withRate.reduce((sum, s) => sum + (s.onTimeRatePct ?? 0), 0) /
              withRate.length,
          )
        : null;
    const avgLead =
      suppliers.length > 0
        ? Math.round(
            suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) /
              suppliers.length,
          )
        : 0;
    return { totalPos, avgOnTime, avgLead };
  }, [suppliers]);

  const createSupplier = useMutation(
    trpc.supplier.create.mutationOptions({
      onSuccess: async () => {
        setName("");
        setEmail("");
        setLeadTimeDays("7");
        await queryClient.invalidateQueries(trpc.supplier.list.queryFilter());
      },
    }),
  );

  return (
    <SettingsPage>
      <PageHeader
        description="Manage vendor contacts, lead times, and on-time delivery performance."
        title="Suppliers"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint="Active vendor records"
          icon={Users}
          isLoading={suppliersQuery.isLoading}
          label="Suppliers"
          value={suppliers.length}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Average lead time in days"
          icon={Clock}
          isLoading={suppliersQuery.isLoading}
          label="Avg lead time"
          value={stats.avgLead > 0 ? `${stats.avgLead}d` : "—"}
        />
        <KpiStatCard
          accent="success"
          hint={
            stats.avgOnTime !== null
              ? `${stats.totalPos} purchase orders total`
              : "No delivery history yet"
          }
          icon={Truck}
          isLoading={suppliersQuery.isLoading}
          label="On-time rate"
          value={stats.avgOnTime !== null ? `${stats.avgOnTime}%` : "—"}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Add a supplier to use when creating purchase orders."
          icon={Plus}
          title="Create supplier"
        />
        <SettingsPanelBody>
          <SettingsFilterBar>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Name</Label>
                <Input
                  id="supplier-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Supplier name"
                  value={name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email (optional)"
                  value={email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-lead">Lead time (days)</Label>
                <Input
                  id="supplier-lead"
                  max={365}
                  min={1}
                  onChange={(event) => setLeadTimeDays(event.target.value)}
                  type="number"
                  value={leadTimeDays}
                />
              </div>
              <div className="flex items-end">
                <Button
                  disabled={!name.trim() || createSupplier.isPending}
                  onClick={() =>
                    createSupplier.mutate({
                      name,
                      email: email.trim() || null,
                      leadTimeDays: Math.max(1, Number(leadTimeDays) || 7),
                    })
                  }
                >
                  Add supplier
                </Button>
              </div>
            </div>
          </SettingsFilterBar>
        </SettingsPanelBody>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Vendor performance and purchase order history."
          icon={Users}
          title="All suppliers"
        />
        <SettingsPanelBody>
          <SettingsTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Lead time</TableHead>
                  <TableHead>PO count</TableHead>
                  <TableHead>On-time rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {supplier.email ?? "—"}
                    </TableCell>
                    <TableCell>{supplier.leadTimeDays} days</TableCell>
                    <TableCell className="tabular-nums">
                      {supplier._count.purchaseOrders}
                    </TableCell>
                    <TableCell>
                      {supplier.onTimeRatePct === null
                        ? "—"
                        : `${supplier.onTimeRatePct}%`}
                    </TableCell>
                  </TableRow>
                ))}
                {!suppliersQuery.isLoading && suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={5}
                    >
                      No suppliers yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </SettingsTableWrap>
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

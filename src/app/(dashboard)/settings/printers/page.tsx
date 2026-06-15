"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Wifi, WifiOff } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PrintersSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.printer.list.queryOptions());
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const printers = listQuery.data ?? [];

  const [warehouseId, setWarehouseId] = useState("");
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("9100");

  const stats = useMemo(() => {
    const online = printers.filter((p) => p.isOnline).length;
    const warehouses = new Set(printers.map((p) => p.warehouse.id)).size;
    return { online, offline: printers.length - online, warehouses };
  }, [printers]);

  const register = useMutation(
    trpc.printer.register.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.printer.list.queryFilter());
        setName("");
        setIpAddress("");
        setPort("9100");
      },
    }),
  );

  const ping = useMutation(
    trpc.printer.ping.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.printer.list.queryFilter());
      },
    }),
  );

  const onRegister = () => {
    if (!warehouseId || !name.trim() || !ipAddress.trim()) {
      return;
    }
    register.mutate({
      warehouseId,
      name: name.trim(),
      ipAddress: ipAddress.trim(),
      port: Number(port) || 9100,
    });
  };

  return (
    <SettingsPage>
      <PageHeader
        description="Register Zebra-style printers by IP (raw TCP, usually port 9100). Ping verifies connectivity and updates online status."
        title="Thermal printers"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint="Registered across all warehouses"
          icon={Printer}
          isLoading={listQuery.isLoading}
          label="Printers"
          value={printers.length}
        />
        <KpiStatCard
          accent="success"
          hint="Responding to TCP ping"
          icon={Wifi}
          isLoading={listQuery.isLoading}
          label="Online"
          value={stats.online}
        />
        <KpiStatCard
          accent={stats.offline > 0 ? "warning" : "navy-teal"}
          hint={`Across ${stats.warehouses} warehouse${stats.warehouses === 1 ? "" : "s"}`}
          icon={WifiOff}
          isLoading={listQuery.isLoading}
          label="Offline"
          value={stats.offline}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Ping verifies TCP connectivity and updates online status."
          icon={Printer}
          title="Register printer"
        />
        <SettingsPanelBody>
          <SettingsFilterBar>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select
                  onValueChange={setWarehouseId}
                  value={warehouseId || undefined}
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
              <div className="space-y-2">
                <Label htmlFor="pname">Name</Label>
                <Input
                  id="pname"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Station 1 — Zebra ZD421"
                  value={name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pip">IP address</Label>
                <Input
                  id="pip"
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="192.168.1.50"
                  value={ipAddress}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pport">Port</Label>
                <Input
                  id="pport"
                  inputMode="numeric"
                  onChange={(e) => setPort(e.target.value)}
                  value={port}
                />
              </div>
              <div className="flex items-end">
                <Button
                  disabled={register.isPending || !warehouseId}
                  onClick={onRegister}
                  type="button"
                >
                  Save printer
                </Button>
              </div>
            </div>
          </SettingsFilterBar>
        </SettingsPanelBody>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsPanelHeader
          description="All thermal printers registered to your warehouses."
          title="Registered printers"
        />
        <SettingsPanelBody>
          {!listQuery.isLoading && printers.length === 0 ? (
            <EmptyState
              description="Register a printer above to start printing labels from the operator dashboard."
              icon={Printer}
              title="No printers registered"
            />
          ) : (
            <SettingsTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ping</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.warehouse.code}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.ipAddress}:{p.port}
                      </TableCell>
                      <TableCell>
                        {p.isOnline ? (
                          <Badge variant="success">Online</Badge>
                        ) : (
                          <Badge variant="secondary">Offline</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          disabled={ping.isPending}
                          onClick={() => ping.mutate({ printerId: p.id })}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Ping
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SettingsTableWrap>
          )}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

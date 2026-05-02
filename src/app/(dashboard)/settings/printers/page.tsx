"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

  const [warehouseId, setWarehouseId] = useState("");
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("9100");

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Thermal printers</h1>
        <p className="text-sm text-muted-foreground">
          Register Zebra-style printers by IP (raw TCP, usually port 9100).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register printer</CardTitle>
          <CardDescription>
            Ping verifies TCP connectivity and updates online status.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select
              value={warehouseId || undefined}
              onValueChange={setWarehouseId}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Station 1 — Zebra ZD421"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pip">IP address</Label>
            <Input
              id="pip"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pport">Port</Label>
            <Input
              id="pport"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={onRegister}
              disabled={register.isPending || !warehouseId}
            >
              Save printer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered printers</CardTitle>
        </CardHeader>
        <CardContent>
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
              {(listQuery.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.warehouse.code}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {p.ipAddress}:{p.port}
                  </TableCell>
                  <TableCell>
                    {p.isOnline ? (
                      <Badge>Online</Badge>
                    ) : (
                      <Badge variant="secondary">Offline</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={ping.isPending}
                      onClick={() => ping.mutate({ printerId: p.id })}
                    >
                      Ping
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!listQuery.data?.length && !listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm">
                    No printers registered.
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

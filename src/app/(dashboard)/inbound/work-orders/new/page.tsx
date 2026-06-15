"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Cog, Package, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsListItem,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
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

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const merchantsQuery = useQuery(trpc.merchant.list.queryOptions());
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const workOrdersQuery = useQuery(trpc.workOrder.list.queryOptions({}));
  const [merchantId, setMerchantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState<
    "KITTING" | "ASSEMBLY" | "BUNDLING" | "REPACKAGING"
  >("KITTING");
  const [targetQty, setTargetQty] = useState("1");
  const [outputProductId, setOutputProductId] = useState("");
  const [outputBinId, setOutputBinId] = useState("");
  const [qtyPerUnit, setQtyPerUnit] = useState("1");
  const [inputProductId, setInputProductId] = useState("");

  const workOrders = workOrdersQuery.data ?? [];
  const stats = useMemo(() => {
    const pending = workOrders.filter((wo) => wo.status === "PENDING").length;
    const inProgress = workOrders.filter(
      (wo) => wo.status === "IN_PROGRESS",
    ).length;
    const completed = workOrders.filter(
      (wo) => wo.status === "COMPLETED",
    ).length;
    return { pending, inProgress, completed };
  }, [workOrders]);

  const productsQuery = useQuery(
    trpc.product.list.queryOptions({
      merchantId: merchantId || undefined,
      page: 1,
      limit: 100,
    }),
  );

  const createWorkOrder = useMutation(
    trpc.workOrder.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Work order created");
        await queryClient.invalidateQueries(
          trpc.workOrder.list.queryFilter({}),
        );
      },
      onError: (err) => toast.error(err.message ?? "Could not create work order"),
    }),
  );

  const [completeQtyById, setCompleteQtyById] = useState<
    Record<string, string>
  >({});

  const startWorkOrder = useMutation(
    trpc.workOrder.start.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.workOrder.list.queryFilter({}),
        );
      },
    }),
  );

  const completeWorkOrder = useMutation(
    trpc.workOrder.complete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.workOrder.list.queryFilter({}),
        );
      },
    }),
  );

  const locationsQuery = useQuery(
    trpc.stockLevel.locations.queryOptions({
      warehouseId: warehouseId || undefined,
    }),
  );
  const warehouseBins =
    locationsQuery.data
      ?.flatMap((zone) => zone.bins)
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [];

  return (
    <SettingsPage>
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/inbound">Back to inbound</Link>
          </Button>
        }
        description="Create kitting, assembly, bundling, or repackaging work orders for inbound processing."
        title="New work order"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiStatCard
          accent="warning"
          hint="Awaiting start"
          icon={ClipboardList}
          isLoading={workOrdersQuery.isLoading}
          label="Pending"
          value={stats.pending}
        />
        <KpiStatCard
          accent="navy-blue"
          hint="Currently in progress"
          icon={PlayCircle}
          isLoading={workOrdersQuery.isLoading}
          label="In progress"
          value={stats.inProgress}
        />
        <KpiStatCard
          accent="success"
          hint="Finished work orders"
          icon={Cog}
          isLoading={workOrdersQuery.isLoading}
          label="Completed"
          value={stats.completed}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Define merchant, warehouse, work type, and target quantity."
          icon={Cog}
          title="Work order setup"
        />
        <SettingsPanelBody className="space-y-5">
          <div className="dashboard-form-section space-y-4">
            <p className="text-sm font-semibold text-foreground">Basics</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Merchant</Label>
                <Select onValueChange={setMerchantId} value={merchantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchantsQuery.data?.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select onValueChange={setWarehouseId} value={warehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehousesQuery.data?.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  onValueChange={(value) => setType(value as typeof type)}
                  value={type}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KITTING">Kitting</SelectItem>
                    <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                    <SelectItem value="BUNDLING">Bundling</SelectItem>
                    <SelectItem value="REPACKAGING">Repackaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-qty">Target qty</Label>
                <Input
                  id="target-qty"
                  min={1}
                  onChange={(event) => setTargetQty(event.target.value)}
                  type="number"
                  value={targetQty}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-form-section space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="size-4 text-muted-foreground" aria-hidden />
              Products & output bin
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Output product</Label>
                <Select
                  onValueChange={setOutputProductId}
                  value={outputProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Output product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsQuery.data?.items.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} — {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Input component</Label>
                <Select
                  onValueChange={setInputProductId}
                  value={inputProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Input component" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsQuery.data?.items.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} — {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty-per-unit">Qty per unit</Label>
                <Input
                  id="qty-per-unit"
                  min={1}
                  onChange={(event) => setQtyPerUnit(event.target.value)}
                  type="number"
                  value={qtyPerUnit}
                />
              </div>
              <div className="space-y-2">
                <Label>Output bin</Label>
                <Select onValueChange={setOutputBinId} value={outputBinId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Output bin" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseBins.map((bin) => (
                      <SelectItem key={bin.id} value={bin.id}>
                        {bin.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            disabled={
              createWorkOrder.isPending ||
              !merchantId ||
              !warehouseId ||
              !outputProductId ||
              !inputProductId ||
              !outputBinId
            }
            onClick={() =>
              createWorkOrder.mutate({
                merchantId,
                warehouseId,
                type,
                targetQty: Math.max(1, Number(targetQty) || 1),
                outputProductId,
                outputBinId,
                inputLines: [
                  {
                    productId: inputProductId,
                    qtyPerUnit: Math.max(1, Number(qtyPerUnit) || 1),
                  },
                ],
              })
            }
          >
            Create work order
          </Button>
        </SettingsPanelBody>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Start and complete work orders as they move through your inbound workflow."
          icon={ClipboardList}
          title="Work order execution"
        />
        <SettingsPanelBody className="space-y-3">
          {workOrders.map((workOrder) => (
            <SettingsListItem
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-24"
                    min={1}
                    onChange={(event) =>
                      setCompleteQtyById((prev) => ({
                        ...prev,
                        [workOrder.id]: event.target.value,
                      }))
                    }
                    type="number"
                    value={
                      completeQtyById[workOrder.id] ??
                      String(workOrder.targetQty)
                    }
                  />
                  <Button
                    disabled={
                      workOrder.status !== "PENDING" || startWorkOrder.isPending
                    }
                    onClick={() =>
                      startWorkOrder.mutate({ workOrderId: workOrder.id })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Start
                  </Button>
                  <Button
                    disabled={
                      workOrder.status !== "IN_PROGRESS" ||
                      completeWorkOrder.isPending
                    }
                    onClick={() =>
                      completeWorkOrder.mutate({
                        workOrderId: workOrder.id,
                        completedQty: Math.max(
                          1,
                          Number(
                            completeQtyById[workOrder.id] ??
                              String(workOrder.targetQty),
                          ) || 1,
                        ),
                      })
                    }
                    size="sm"
                    type="button"
                  >
                    Complete
                  </Button>
                </div>
              }
              key={workOrder.id}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {workOrder.woNumber}
                  </p>
                  <StatusBadge status={workOrder.status} />
                  <Badge variant="secondary">{workOrder.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: {workOrder.targetQty}
                  {workOrder.outputProduct
                    ? ` · Output: ${workOrder.outputProduct.sku}`
                    : ""}
                </p>
              </div>
            </SettingsListItem>
          ))}
          {!workOrdersQuery.isLoading && workOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No work orders yet. Create one above.
            </p>
          ) : null}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

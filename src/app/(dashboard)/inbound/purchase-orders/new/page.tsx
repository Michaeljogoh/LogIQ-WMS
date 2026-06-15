"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, Package, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
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
  const router = useRouter();
  const merchantsQuery = useQuery(trpc.merchant.list.queryOptions());
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const suppliersQuery = useQuery(trpc.supplier.list.queryOptions());
  const [merchantId, setMerchantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState("1");

  const productsQuery = useQuery(
    trpc.product.list.queryOptions({
      merchantId: merchantId || undefined,
      page: 1,
      limit: 100,
    }),
  );
  const [productId, setProductId] = useState("");

  const createPo = useMutation(
    trpc.purchaseOrder.create.mutationOptions({
      onSuccess: () => {
        toast.success("Purchase order created");
        router.push("/inbound/purchase-orders");
      },
      onError: (err) => toast.error(err.message ?? "Could not create PO"),
    }),
  );

  return (
    <SettingsPage>
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/inbound/purchase-orders">Back to list</Link>
          </Button>
        }
        description="Create a purchase order and send it to your supplier for inbound receiving."
        title="New purchase order"
      />

      <SettingsPanel>
        <SettingsPanelHeader
          description="Select merchant, warehouse, supplier, and expected delivery date."
          icon={Truck}
          title="Order details"
        />
        <SettingsPanelBody>
          <div className="dashboard-form-section space-y-4">
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
                <Label>Supplier</Label>
                <Select onValueChange={setSupplierId} value={supplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliersQuery.data?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected-date">
                  <Calendar className="mr-1 inline size-3.5" aria-hidden />
                  Expected date
                </Label>
                <Input
                  id="expected-date"
                  onChange={(event) => setExpectedDate(event.target.value)}
                  type="date"
                  value={expectedDate}
                />
              </div>
            </div>
          </div>
        </SettingsPanelBody>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Add at least one line item to the purchase order."
          icon={Package}
          title="Line items"
        />
        <SettingsPanelBody>
          <div className="dashboard-form-section space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Product</Label>
                <Select onValueChange={setProductId} value={productId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Product" />
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
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  min={1}
                  onChange={(event) => setQty(event.target.value)}
                  type="number"
                  value={qty}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Internal notes</Label>
              <Input
                id="notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes for your team"
                value={notes}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-5">
            <Button
              disabled={
                createPo.isPending ||
                !merchantId ||
                !warehouseId ||
                !supplierId ||
                !productId
              }
              onClick={() =>
                createPo.mutate({
                  merchantId,
                  warehouseId,
                  supplierId,
                  expectedDate: expectedDate ? new Date(expectedDate) : null,
                  notes: notes.trim() || null,
                  sendNow: true,
                  lines: [
                    {
                      productId,
                      orderedQty: Math.max(1, Number(qty) || 1),
                    },
                  ],
                })
              }
            >
              Create PO
            </Button>
            <Button asChild variant="outline">
              <Link href="/inbound/purchase-orders">Cancel</Link>
            </Button>
          </div>
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

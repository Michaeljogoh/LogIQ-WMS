"use client";

import { useQuery } from "@tanstack/react-query";
import { Boxes, Package, Search } from "lucide-react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");
  const productsQuery = useQuery(
    trpc.product.list.queryOptions({
      page: 1,
      limit: 100,
      search: search.trim() || undefined,
    }),
  );

  const items = productsQuery.data?.items ?? [];
  const stats = useMemo(() => {
    const active = items.filter((row) => row.isActive).length;
    const onHand = items.reduce((sum, row) => sum + row.totalQuantity, 0);
    const available = items.reduce(
      (sum, row) => sum + row.totalAvailableQty,
      0,
    );
    return { total: items.length, active, onHand, available };
  }, [items]);

  return (
    <SettingsPage>
      <PageHeader
        description="Search across merchant SKUs and review total available stock."
        title="Products"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="Matching current search"
          icon={Package}
          isLoading={productsQuery.isLoading}
          label="Products"
          value={stats.total}
        />
        <KpiStatCard
          accent="success"
          hint="Active merchant SKUs"
          icon={Boxes}
          isLoading={productsQuery.isLoading}
          label="Active SKUs"
          value={stats.active}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Total quantity on hand"
          icon={Package}
          isLoading={productsQuery.isLoading}
          label="On hand"
          value={stats.onHand.toLocaleString()}
        />
        <KpiStatCard
          accent="navy-violet"
          hint="Available to fulfill"
          icon={Boxes}
          isLoading={productsQuery.isLoading}
          label="Available"
          value={stats.available.toLocaleString()}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Click a SKU to view product detail and stock by location."
          icon={Package}
          title="Product catalog"
        />
        <SettingsPanelBody>
          <SettingsFilterBar>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by SKU, barcode, or name…"
                value={search}
              />
            </div>
          </SettingsFilterBar>
          <SettingsTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={5}
                    >
                      Loading products…
                    </TableCell>
                  </TableRow>
                ) : null}
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="text-primary hover:underline"
                        href={`/inventory/products/${row.id}`}
                      >
                        {row.sku}
                      </Link>
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.merchant.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.totalQuantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.totalAvailableQty}
                    </TableCell>
                  </TableRow>
                ))}
                {!productsQuery.isLoading && items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={5}
                    >
                      No products found.
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

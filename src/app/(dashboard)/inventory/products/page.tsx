"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Search across merchant SKUs and review total available stock.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by SKU, barcode, or name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
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
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : null}
              {productsQuery.data?.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/inventory/products/${row.id}`}
                      className="hover:underline"
                    >
                      {row.sku}
                    </Link>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.merchant.name}</TableCell>
                  <TableCell className="text-right">
                    {row.totalQuantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.totalAvailableQty}
                  </TableCell>
                </TableRow>
              ))}
              {!productsQuery.isLoading && !productsQuery.data?.items.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No products found.
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

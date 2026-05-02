"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LABEL_TYPES = [
  "PRODUCT_BARCODE",
  "BIN_LOCATION",
  "PALLET",
  "SHIPPING_OUTER",
] as const;

type LabelFilterType = (typeof LABEL_TYPES)[number] | "ALL";

/** Matches `labelTemplate.list` output shape without deep tRPC inference. */
type LabelTemplateRow = {
  id: string;
  name: string;
  type: string;
  widthMm: number;
  heightMm: number;
  fields: unknown;
  isDefault: boolean;
};

export default function LabelTemplatesPage() {
  const trpc = useTRPC();
  const [filterType, setFilterType] = useState<LabelFilterType>("ALL");

  const listInput: { type?: (typeof LABEL_TYPES)[number] } =
    filterType === "ALL" ? {} : { type: filterType };

  const listQuery = useQuery(trpc.labelTemplate.list.queryOptions(listInput));

  const filtered: LabelTemplateRow[] = (listQuery.data ??
    []) as LabelTemplateRow[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Label templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage barcode and location layouts; defaults drive automatic
            product labels when SKUs are created.
          </p>
        </div>
        <Button asChild className="min-h-11 min-w-[44px]">
          <Link href="/labels/templates/new">New template</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter by type</span>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as LabelFilterType)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {LABEL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => (
          <Card key={template.id}>
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.isDefault ? (
                  <Badge variant="secondary">Default</Badge>
                ) : null}
              </div>
              <Badge variant="outline">{template.type}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {template.widthMm.toFixed(1)} × {template.heightMm.toFixed(1)}{" "}
                mm
              </p>
              <p>
                {Array.isArray(template.fields)
                  ? `${(template.fields as unknown[]).length} fields`
                  : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : null}
      {!listQuery.isLoading && filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No templates yet.{" "}
            <Link className="underline" href="/labels/templates/new">
              Create one
            </Link>
            .
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function PackagingSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const now = useMemo(() => new Date(), []);
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);

  const listQuery = useQuery(trpc.packaging.list.queryOptions({}));

  const costReportQuery = useQuery(
    trpc.packaging.costReport.queryOptions({
      year: reportYear,
      month: reportMonth,
    }),
  );

  const createMutation = useMutation(
    trpc.packaging.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Packaging type saved");
        await queryClient.invalidateQueries(trpc.packaging.list.queryFilter());
      },
      onError: (e) => toast.error(e.message ?? "Save failed"),
    }),
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lengthIn, setLengthIn] = useState("12");
  const [widthIn, setWidthIn] = useState("9");
  const [heightIn, setHeightIn] = useState("6");
  const [maxWeightOz, setMaxWeightOz] = useState("50");
  const [tareWeightOz, setTareWeightOz] = useState("4");
  const [costDollars, setCostDollars] = useState("0.75");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Packaging library
        </h1>
        <p className="text-sm text-muted-foreground">
          Box dimensions, tare weight, and cost drive DIM-aware packing and
          merchant packaging charges.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle>Box types</CardTitle>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button type="button" className="min-h-11">
                Add packaging type
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>New packaging type</SheetTitle>
              </SheetHeader>
              <div className="grid gap-3 px-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="pn">Name</Label>
                  <Input
                    id="pn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Small box 12×9×6"
                    className="min-h-11"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>L (in)</Label>
                    <Input
                      value={lengthIn}
                      onChange={(e) => setLengthIn(e.target.value)}
                      inputMode="decimal"
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>W (in)</Label>
                    <Input
                      value={widthIn}
                      onChange={(e) => setWidthIn(e.target.value)}
                      inputMode="decimal"
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>H (in)</Label>
                    <Input
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      inputMode="decimal"
                      className="min-h-11"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Max load (oz)</Label>
                    <Input
                      value={maxWeightOz}
                      onChange={(e) => setMaxWeightOz(e.target.value)}
                      inputMode="decimal"
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tare (oz)</Label>
                    <Input
                      value={tareWeightOz}
                      onChange={(e) => setTareWeightOz(e.target.value)}
                      inputMode="decimal"
                      className="min-h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cost per box (USD)</Label>
                  <Input
                    value={costDollars}
                    onChange={(e) => setCostDollars(e.target.value)}
                    inputMode="decimal"
                    className="min-h-11"
                  />
                </div>
              </div>
              <SheetFooter>
                <Button
                  type="button"
                  disabled={createMutation.isPending || !name.trim()}
                  onClick={() => {
                    const costCents = Math.round(
                      Number.parseFloat(costDollars || "0") * 100,
                    );
                    createMutation.mutate(
                      {
                        name: name.trim(),
                        lengthIn: Number.parseFloat(lengthIn),
                        widthIn: Number.parseFloat(widthIn),
                        heightIn: Number.parseFloat(heightIn),
                        maxWeightOz: Number.parseFloat(maxWeightOz),
                        tareWeightOz: Number.parseFloat(tareWeightOz),
                        costCents,
                      },
                      {
                        onSuccess: () => {
                          setOpen(false);
                          setName("");
                        },
                      },
                    );
                  }}
                >
                  Save
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Dims (in)</TableHead>
                <TableHead className="text-right">Max oz</TableHead>
                <TableHead className="text-right">Tare oz</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.data?.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    {row.lengthIn} × {row.widthIn} × {row.heightIn}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.maxWeightOz}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.tareWeightOz}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.costCents)}
                  </TableCell>
                </TableRow>
              ))}
              {listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly packaging cost by merchant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label>Year</Label>
              <Input
                type="number"
                className="w-28 min-h-11"
                value={reportYear}
                onChange={(e) =>
                  setReportYear(Number.parseInt(e.target.value, 10))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Month</Label>
              <Input
                type="number"
                min={1}
                max={12}
                className="w-24 min-h-11"
                value={reportMonth}
                onChange={(e) =>
                  setReportMonth(Number.parseInt(e.target.value, 10))
                }
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead className="text-right">Shipments</TableHead>
                <TableHead className="text-right">Packaging cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costReportQuery.data?.rows.map((r) => (
                <TableRow key={r.merchantId}>
                  <TableCell>{r.merchantName}</TableCell>
                  <TableCell className="text-right">
                    {r.shipmentCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(r.totalPackagingCostCents)}
                  </TableCell>
                </TableRow>
              ))}
              {!costReportQuery.isLoading &&
              (costReportQuery.data?.rows.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No packaged shipments in this period.
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

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, DollarSign, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
  const packagingTypes = listQuery.data ?? [];

  const costReportQuery = useQuery(
    trpc.packaging.costReport.queryOptions({
      year: reportYear,
      month: reportMonth,
    }),
  );

  const reportRows = costReportQuery.data?.rows ?? [];
  const totalCostCents = reportRows.reduce(
    (sum, row) => sum + row.totalPackagingCostCents,
    0,
  );
  const totalShipments = reportRows.reduce(
    (sum, row) => sum + row.shipmentCount,
    0,
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
    <SettingsPage>
      <PageHeader
        description="Box dimensions, tare weight, and cost drive DIM-aware packing and merchant packaging charges."
        title="Packaging library"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint="Configured box types"
          icon={Package}
          isLoading={listQuery.isLoading}
          label="Box types"
          value={packagingTypes.length}
        />
        <KpiStatCard
          accent="navy-teal"
          hint={`${reportMonth}/${reportYear} report period`}
          icon={Box}
          isLoading={costReportQuery.isLoading}
          label="Shipments"
          value={totalShipments}
        />
        <KpiStatCard
          accent="success"
          hint="Total packaging charges"
          icon={DollarSign}
          isLoading={costReportQuery.isLoading}
          label="Monthly cost"
          value={formatMoney(totalCostCents)}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          actions={
            <Sheet onOpenChange={setOpen} open={open}>
              <SheetTrigger asChild>
                <Button className="min-h-11" type="button">
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
                      className="min-h-11"
                      id="pn"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Small box 12×9×6"
                      value={name}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label>L (in)</Label>
                      <Input
                        className="min-h-11"
                        inputMode="decimal"
                        onChange={(e) => setLengthIn(e.target.value)}
                        value={lengthIn}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>W (in)</Label>
                      <Input
                        className="min-h-11"
                        inputMode="decimal"
                        onChange={(e) => setWidthIn(e.target.value)}
                        value={widthIn}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>H (in)</Label>
                      <Input
                        className="min-h-11"
                        inputMode="decimal"
                        onChange={(e) => setHeightIn(e.target.value)}
                        value={heightIn}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Max load (oz)</Label>
                      <Input
                        className="min-h-11"
                        inputMode="decimal"
                        onChange={(e) => setMaxWeightOz(e.target.value)}
                        value={maxWeightOz}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tare (oz)</Label>
                      <Input
                        className="min-h-11"
                        inputMode="decimal"
                        onChange={(e) => setTareWeightOz(e.target.value)}
                        value={tareWeightOz}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cost per box (USD)</Label>
                    <Input
                      className="min-h-11"
                      inputMode="decimal"
                      onChange={(e) => setCostDollars(e.target.value)}
                      value={costDollars}
                    />
                  </div>
                </div>
                <SheetFooter>
                  <Button
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
                    type="button"
                  >
                    Save
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          }
          icon={Package}
          title="Box types"
        />
        <SettingsPanelBody>
          <SettingsTableWrap>
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
                {packagingTypes.map((row) => (
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
                    <TableCell className="text-muted-foreground" colSpan={5}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </SettingsTableWrap>
        </SettingsPanelBody>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Packaging charges grouped by merchant for the selected period."
          icon={DollarSign}
          title="Monthly packaging cost by merchant"
        />
        <SettingsPanelBody>
          <SettingsFilterBar>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <Label>Year</Label>
                <Input
                  className="min-h-11 w-28"
                  onChange={(e) =>
                    setReportYear(Number.parseInt(e.target.value, 10))
                  }
                  type="number"
                  value={reportYear}
                />
              </div>
              <div className="space-y-1">
                <Label>Month</Label>
                <Input
                  className="min-h-11 w-24"
                  max={12}
                  min={1}
                  onChange={(e) =>
                    setReportMonth(Number.parseInt(e.target.value, 10))
                  }
                  type="number"
                  value={reportMonth}
                />
              </div>
            </div>
          </SettingsFilterBar>
          <SettingsTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Shipments</TableHead>
                  <TableHead className="text-right">Packaging cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportRows.map((r) => (
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
                {!costReportQuery.isLoading && reportRows.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={3}>
                      No packaged shipments in this period.
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

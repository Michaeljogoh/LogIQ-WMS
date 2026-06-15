"use client";

import { Line, LineChart, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import {
  paginateRows,
  TablePagination,
} from "@/components/shared/table-pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 8;

type Row = {
  id: string;
  onHandQty: number;
  avgDailyOutbound: number;
  daysOfStockRemaining: number | null;
  stockoutRisk: number;
  outboundSparkline: unknown;
  product: { sku: string; name: string };
  warehouse: { code: string; name: string };
};

function riskVariant(
  risk: number,
): "default" | "secondary" | "destructive" | "outline" {
  if (risk >= 0.66) {
    return "destructive";
  }
  if (risk >= 0.33) {
    return "secondary";
  }
  return "outline";
}

function riskLabel(risk: number): string {
  if (risk >= 0.66) {
    return "RED";
  }
  if (risk >= 0.33) {
    return "AMBER";
  }
  return "GREEN";
}

export function StockForecastTable(props: { rows: Row[]; isLoading: boolean }) {
  const [page, setPage] = useState(0);
  const pageRows = paginateRows(props.rows, page, PAGE_SIZE);

  return (
    <SettingsPanel className="w-full">
      <SettingsPanelHeader
        description="SKUs ranked by stock-out probability based on outbound velocity."
        icon={TrendingUp}
        title="Stock-out risk"
      />
      <SettingsPanelBody className="p-0">
        {props.isLoading ? (
          <div className="p-6">
            <TableSkeleton columns={6} rows={5} />
          </div>
        ) : props.rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No stock forecasts yet. Run intelligence scans to populate risk
            scores.
          </p>
        ) : (
          <>
            <SettingsTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>On hand</TableHead>
                    <TableHead>Days left</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="w-[140px]">Trend (14d)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const spark =
                      Array.isArray(r.outboundSparkline) &&
                      r.outboundSparkline.every((x) => typeof x === "number")
                        ? (r.outboundSparkline as number[]).map((v, i) => ({
                            i,
                            v,
                          }))
                        : [];
                    return (
                      <TableRow className="logiq-table-row" key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.product.sku}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.product.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.warehouse.code}
                          <div className="text-xs text-muted-foreground">
                            {r.warehouse.name}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.onHandQty}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.daysOfStockRemaining !== null
                            ? r.daysOfStockRemaining.toFixed(1)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={riskVariant(r.stockoutRisk)}>
                            {riskLabel(r.stockoutRisk)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {spark.length > 0 ? (
                            <ChartContainer
                              className="h-12 w-full"
                              config={{
                                v: { label: "units", color: "var(--chart-1)" },
                              }}
                              initialDimension={{ width: 120, height: 48 }}
                            >
                              <LineChart data={spark}>
                                <XAxis dataKey="i" hide />
                                <YAxis hide />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line
                                  dataKey="v"
                                  dot={false}
                                  stroke="var(--color-v)"
                                  strokeWidth={2}
                                  type="monotone"
                                />
                              </LineChart>
                            </ChartContainer>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </SettingsTableWrap>
            <TablePagination
              label="SKUs"
              onPageChange={setPage}
              page={page}
              pageSize={PAGE_SIZE}
              total={props.rows.length}
            />
          </>
        )}
      </SettingsPanelBody>
    </SettingsPanel>
  );
}

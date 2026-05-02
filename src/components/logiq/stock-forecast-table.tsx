"use client";

import { Line, LineChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock-out risk</CardTitle>
      </CardHeader>
      <CardContent>
        {props.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
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
              {props.rows.map((r) => {
                const spark =
                  Array.isArray(r.outboundSparkline) &&
                  r.outboundSparkline.every((x) => typeof x === "number")
                    ? (r.outboundSparkline as number[]).map((v, i) => ({
                        i,
                        v,
                      }))
                    : [];
                return (
                  <TableRow key={r.id}>
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
                    <TableCell>{r.onHandQty}</TableCell>
                    <TableCell>
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
                          config={{
                            v: { label: "units", color: "var(--chart-1)" },
                          }}
                          className="h-12 w-full"
                          initialDimension={{ width: 120, height: 48 }}
                        >
                          <LineChart data={spark}>
                            <XAxis dataKey="i" hide />
                            <YAxis hide />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                              type="monotone"
                              dataKey="v"
                              stroke="var(--color-v)"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ChartContainer>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

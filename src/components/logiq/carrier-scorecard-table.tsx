"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  carrier: string;
  service: string;
  destinationZone: number | null;
  weightTier: string | null;
  onTimeRate: number;
  damageRate: number;
  avgCostCents: number;
  avgActualDays: number;
  score: number;
};

export function CarrierScorecardTable(props: {
  rows: Row[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carrier scorecards</CardTitle>
      </CardHeader>
      <CardContent>
        {props.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : props.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No carrier performance data yet (delivered shipments build this over
            time).
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carrier / service</TableHead>
                <TableHead>On-time</TableHead>
                <TableHead>Damage</TableHead>
                <TableHead>Avg cost</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.carrier}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.service}
                      {r.weightTier ? ` · ${r.weightTier}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="w-40">
                    <Progress value={r.onTimeRate * 100} className="h-2" />
                    <span className="text-xs text-muted-foreground">
                      {(r.onTimeRate * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell>{(r.damageRate * 100).toFixed(0)}%</TableCell>
                  <TableCell>${(r.avgCostCents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={r.score >= 0.65 ? "default" : "secondary"}>
                      {(r.score * 100).toFixed(0)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

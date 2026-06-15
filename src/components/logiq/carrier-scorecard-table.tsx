"use client";

import { Sparkles } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
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
  const [page, setPage] = useState(0);
  const pageRows = paginateRows(props.rows, page, PAGE_SIZE);

  return (
    <SettingsPanel className="w-full">
      <SettingsPanelHeader
        description="On-time delivery, damage rate, and blended performance scores by carrier."
        icon={Sparkles}
        title="Carrier scorecards"
      />
      <SettingsPanelBody className="p-0">
        {props.isLoading ? (
          <div className="p-6">
            <TableSkeleton columns={5} rows={5} />
          </div>
        ) : props.rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No carrier performance data yet. Delivered shipments build scorecards
            over time.
          </p>
        ) : (
          <>
            <SettingsTableWrap>
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
                  {pageRows.map((r) => (
                    <TableRow className="logiq-table-row" key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.carrier}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.service}
                          {r.weightTier ? ` · ${r.weightTier}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="w-44">
                        <Progress className="mb-1 h-2" value={r.onTimeRate * 100} />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {(r.onTimeRate * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {(r.damageRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="tabular-nums">
                        ${(r.avgCostCents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.score >= 0.65 ? "default" : "secondary"}>
                          {(r.score * 100).toFixed(0)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SettingsTableWrap>
            <TablePagination
              label="Carriers"
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

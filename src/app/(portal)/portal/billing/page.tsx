"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CreditCard, FileText, Scale } from "lucide-react";
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
import {
  paginateRows,
  TablePagination,
} from "@/components/shared/table-pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 8;

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function Page() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invoicesQuery = useQuery(trpc.invoice.listMine.queryOptions());
  const [page, setPage] = useState(0);
  const [reason, setReason] = useState("");
  const [invoiceId, setInvoiceId] = useState("");

  const dispute = useMutation(
    trpc.invoice.dispute.mutationOptions({
      onSuccess: async () => {
        setReason("");
        setInvoiceId("");
        await queryClient.invalidateQueries(
          trpc.invoice.listMine.queryFilter(),
        );
      },
    }),
  );

  const invoices = (invoicesQuery.data ?? []) as Array<{
    id: string;
    invoiceNumber: string;
    totalCents: number;
    status: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    disputes: unknown[];
  }>;
  const pageInvoices = paginateRows(invoices, page, PAGE_SIZE);

  const stats = useMemo(() => {
    const totalCents = invoices.reduce((sum, inv) => sum + inv.totalCents, 0);
    const disputed = invoices.filter((inv) => inv.disputes.length > 0).length;
    const open = invoices.filter((inv) => inv.status !== "PAID").length;
    return { totalCents, disputed, open, count: invoices.length };
  }, [invoices]);

  return (
    <SettingsPage>
      <PageHeader
        description="Review 3PL invoices, download history, and submit disputes when something looks off."
        title="Billing"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          accent="navy-blue"
          hint="All billing periods"
          icon={FileText}
          isLoading={invoicesQuery.isLoading}
          label="Invoices"
          value={stats.count}
        />
        <KpiStatCard
          accent="navy-violet"
          hint="Lifetime billed amount"
          icon={CreditCard}
          isLoading={invoicesQuery.isLoading}
          label="Total billed"
          value={formatCents(stats.totalCents)}
        />
        <KpiStatCard
          accent="warning"
          hint="Awaiting payment or review"
          icon={AlertCircle}
          isLoading={invoicesQuery.isLoading}
          label="Open invoices"
          value={stats.open}
        />
        <KpiStatCard
          accent={stats.disputed > 0 ? "warning" : "success"}
          hint="Submitted for review"
          icon={Scale}
          isLoading={invoicesQuery.isLoading}
          label="Disputes"
          value={stats.disputed}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Select an invoice to pre-fill the dispute form below."
          icon={FileText}
          title="Invoice history"
        />
        <SettingsPanelBody className="p-0">
          {invoicesQuery.isLoading ? (
            <div className="p-6">
              <TableSkeleton columns={5} rows={5} />
            </div>
          ) : invoices.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No invoices available yet. Your 3PL will generate billing per
              contract.
            </p>
          ) : (
            <>
              <SettingsTableWrap>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Disputes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageInvoices.map((invoice) => (
                      <TableRow
                        className="logiq-table-row cursor-pointer"
                        key={invoice.id}
                        onClick={() => setInvoiceId(invoice.id)}
                      >
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(invoice.periodStart).toLocaleDateString()} –{" "}
                          {new Date(invoice.periodEnd).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="tabular-nums font-medium">
                          {formatCents(invoice.totalCents)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>
                          {invoice.disputes.length > 0 ? (
                            <StatusBadge status="DISPUTED" />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SettingsTableWrap>
              <TablePagination
                label="Invoices"
                onPageChange={setPage}
                page={page}
                pageSize={PAGE_SIZE}
                total={invoices.length}
              />
            </>
          )}
        </SettingsPanelBody>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Explain the issue and we will route it to your 3PL billing team."
          icon={Scale}
          title="Submit a dispute"
        />
        <SettingsPanelBody>
          <SettingsFilterBar className="flex-col items-stretch gap-4 border-0 bg-transparent p-0 shadow-none">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice-id">Invoice ID</Label>
                <Input
                  id="invoice-id"
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="Click a row above or paste ID"
                  value={invoiceId}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispute-reason">Reason</Label>
              <Textarea
                id="dispute-reason"
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the billing issue in detail…"
                rows={4}
                value={reason}
              />
            </div>
            <Button
              className="w-fit min-h-11"
              disabled={
                dispute.isPending || !invoiceId.trim() || !reason.trim()
              }
              onClick={() =>
                dispute.mutate({ invoiceId: invoiceId.trim(), reason })
              }
              type="button"
            >
              {dispute.isPending ? "Submitting…" : "Submit dispute"}
            </Button>
          </SettingsFilterBar>
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

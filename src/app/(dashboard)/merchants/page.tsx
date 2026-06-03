"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  BuildingIcon,
  FileTextIcon,
  PackageIcon,
  TrendingUpIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { CreateMerchantDialog } from "@/components/merchants/create-merchant-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOperatorRole } from "@/hooks/use-operator-role";
import { cn } from "@/lib/utils";

function MerchantCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </div>
  );
}

export default function Page() {
  const trpc = useTRPC();
  const { canCreateMerchant } = useOperatorRole();
  const merchantsQuery = useQuery(trpc.merchant.listWithMetrics.queryOptions());

  const merchants = merchantsQuery.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Merchants"
        description={
          canCreateMerchant
            ? "Client brands you fulfill for. Each merchant gets portal access."
            : "Client brands you fulfill for."
        }
        actions={
          canCreateMerchant ? (
            <CreateMerchantDialog
              onSuccess={() => void merchantsQuery.refetch()}
            />
          ) : undefined
        }
      />

      {merchantsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {["a", "b", "c"].map((k) => (
            <MerchantCardSkeleton key={k} />
          ))}
        </div>
      ) : merchants.length === 0 ? (
        <EmptyState
          icon={BuildingIcon}
          title="No merchants yet"
          description={
            canCreateMerchant
              ? "Add a merchant to set up orders, contracts, and portal access for their team."
              : "No merchants are configured for this account yet."
          }
          action={
            canCreateMerchant ? (
              <CreateMerchantDialog
                onSuccess={() => void merchantsQuery.refetch()}
              />
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {merchants.map((merchant) => {
            const slaGood = merchant.slaScore >= 95;
            const slaWarn = merchant.slaScore >= 80 && merchant.slaScore < 95;
            const invoiceStatus = merchant.latestInvoice?.status;
            return (
              <div
                key={merchant.id}
                className="group rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <BuildingIcon className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold leading-tight text-foreground">
                        {merchant.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {merchant.email}
                      </p>
                    </div>
                  </div>
                  {invoiceStatus ? (
                    <StatusBadge status={invoiceStatus} className="shrink-0" />
                  ) : null}
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <PackageIcon className="size-3.5" />
                      <span className="text-[10px] font-medium uppercase tracking-wide">
                        Orders
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {merchant.orderCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <TrendingUpIcon className="size-3.5" />
                      <span className="text-[10px] font-medium uppercase tracking-wide">
                        SLA
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-lg font-semibold",
                        slaGood
                          ? "text-success"
                          : slaWarn
                            ? "text-warning"
                            : "text-destructive",
                      )}
                    >
                      {merchant.slaScore}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileTextIcon className="size-3.5" />
                      <span className="text-[10px] font-medium uppercase tracking-wide">
                        Invoice
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {merchant.latestInvoice?.invoiceNumber ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 border-t pt-3">
                  <Link
                    href={`/merchants/${merchant.id}/contract`}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    Contract
                    <ArrowRightIcon className="size-3" />
                  </Link>
                  {merchant.latestInvoice ? (
                    <>
                      <span className="text-border">·</span>
                      <Link
                        href={`/merchants/${merchant.id}/invoices/${merchant.latestInvoice.id}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                      >
                        Latest invoice
                        <ArrowRightIcon className="size-3" />
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

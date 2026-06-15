"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TablePagination({
  className,
  label,
  onPageChange,
  page,
  pageSize,
  total,
}: Readonly<{
  className?: string;
  label?: string;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
}>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = total === 0 ? 0 : safePage * pageSize + 1;
  const end = Math.min((safePage + 1) * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <p>
        {total === 0
          ? (label ?? "No rows")
          : `${label ? `${label} · ` : ""}${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          disabled={safePage <= 0}
          onClick={() => onPageChange(Math.max(0, safePage - 1))}
          size="sm"
          type="button"
          variant="outline"
        >
          Previous
        </Button>
        <span className="min-w-[5.5rem] text-center tabular-nums">
          Page {safePage + 1} of {totalPages}
        </span>
        <Button
          disabled={safePage + 1 >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

"use client";

import type { ReactNode } from "react";

/** Thin wrapper — swap for TanStack Table wiring per module. */
export function DataTableShell({
  toolbar,
  children,
}: {
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
      ) : null}
      <div className="rounded-md border">{children}</div>
    </div>
  );
}

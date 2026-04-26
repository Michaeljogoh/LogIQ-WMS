import type { ReactNode } from "react";

export function SharedHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

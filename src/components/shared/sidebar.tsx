import type { ReactNode } from "react";

/** App shell sidebar wrapper — replace with operator/merchant nav per module. */
export function SharedSidebar({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

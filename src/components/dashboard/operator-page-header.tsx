import type { ReactNode } from "react";

export function OperatorPageHeader(
  props: Readonly<{
    title: string;
    description?: string;
    actions?: ReactNode;
  }>,
) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
        {props.description ? (
          <p className="text-sm text-muted-foreground">{props.description}</p>
        ) : null}
      </div>
      {props.actions ? (
        <div className="flex flex-wrap items-center gap-2">{props.actions}</div>
      ) : null}
    </div>
  );
}

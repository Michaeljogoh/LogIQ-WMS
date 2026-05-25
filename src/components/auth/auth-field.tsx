"use client";

import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type AuthFieldProps = Readonly<{
  label: string;
  icon?: LucideIcon;
  error?: string;
}> &
  ComponentProps<"input">;

export function AuthField({
  label,
  icon: Icon,
  error,
  className,
  id,
  ...props
}: AuthFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      <label
        className="text-[11px] font-medium tracking-wide text-[#64748b] uppercase"
        htmlFor={fieldId}
      >
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94a3b8]" />
        ) : null}
        <input
          className={cn(
            "h-11 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#1e293b] shadow-none outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#4a7dff] focus:ring-2 focus:ring-[#4a7dff]/20",
            Icon && "pl-10",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            className,
          )}
          id={fieldId}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type AuthPasswordFieldProps = Readonly<{
  label: string;
  error?: string;
  showKeyIcon?: boolean;
}> &
  Omit<ComponentProps<"input">, "type">;

export function AuthPasswordField({
  label,
  error,
  className,
  id,
  showKeyIcon = true,
  ...props
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
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
        {showKeyIcon ? (
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94a3b8]" />
        ) : null}
        <input
          className={cn(
            "h-11 w-full rounded-lg border border-[#e2e8f0] bg-white pr-10 text-sm text-[#1e293b] shadow-none outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#4a7dff] focus:ring-2 focus:ring-[#4a7dff]/20",
            showKeyIcon ? "pl-10" : "pl-4",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            className,
          )}
          id={fieldId}
          type={visible ? "text" : "password"}
          {...props}
        />
        <button
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-[#94a3b8] transition-colors hover:text-[#64748b]"
          onClick={() => setVisible((v) => !v)}
          type="button"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

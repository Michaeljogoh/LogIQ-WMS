import { cn } from "@/lib/utils";

export function AuthDivider({
  label = "or use email",
  compact = false,
}: Readonly<{ label?: string; compact?: boolean }>) {
  return (
    <div className={cn("relative", compact ? "my-4" : "my-6")}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#e2e8f0]" />
      </div>
      <span className="relative mx-auto block w-fit bg-[#f8f9fb] px-3 text-xs text-[#94a3b8]">
        {label}
      </span>
    </div>
  );
}

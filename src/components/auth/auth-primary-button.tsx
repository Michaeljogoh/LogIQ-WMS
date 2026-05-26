import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthPrimaryButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "h-11 w-full rounded-lg bg-[#4a7dff] text-sm font-semibold text-white shadow-none hover:bg-[#3d6ef0]",
        className,
      )}
      {...props}
    />
  );
}

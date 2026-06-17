import { LogIQLogo } from "@/components/brand/logiq-logo";
import { cn } from "@/lib/utils";

type AuthLogoProps = Readonly<{
  className?: string;
  height?: number;
}>;

export function AuthLogo({ className, height = 56 }: AuthLogoProps) {
  return (
    <LogIQLogo
      className={cn("mx-auto", className)}
      height={height}
      variant="on-light"
    />
  );
}

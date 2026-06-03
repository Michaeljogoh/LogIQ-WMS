import type { IntegrationBrand, IntegrationBrandId } from "@/components/landing/integration-brands";
import { INTEGRATION_BRANDS } from "@/components/landing/integration-brands";
import { cn } from "@/lib/utils";

type IntegrationLogoProps = Readonly<{
  brand: IntegrationBrandId;
  className?: string;
  size?: "sm" | "md";
}>;

const SIZE_CLASS = {
  sm: "h-6 w-[4.5rem] sm:h-7 sm:w-20",
  md: "h-7 w-24 sm:h-8 sm:w-28",
} as const;

export function IntegrationLogo({
  brand,
  className,
  size = "md",
}: IntegrationLogoProps) {
  const config: IntegrationBrand = INTEGRATION_BRANDS[brand];

  return (
    <span
      aria-label={`${config.name} logo`}
      className={cn(
        "inline-block shrink-0 bg-no-repeat opacity-90 transition-opacity duration-200 hover:opacity-100",
        SIZE_CLASS[size],
        className,
      )}
      role="img"
      style={{
        backgroundColor: config.color,
        maskImage: `url(${config.src})`,
        WebkitMaskImage: `url(${config.src})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthSplitLayoutProps = Readonly<{
  heroImage: string;
  heroAlt: string;
  children: ReactNode;
  className?: string;
  /** Lock to viewport height on large screens (no page scroll). */
  fitViewport?: boolean;
}>;

export function AuthSplitLayout({
  heroImage,
  heroAlt,
  children,
  className,
  fitViewport = false,
}: AuthSplitLayoutProps) {
  return (
    <div
      className={cn(
        "flex",
        fitViewport ? "h-svh max-h-svh overflow-hidden" : "min-h-svh",
        className,
      )}
    >
      <div
        className={cn(
          "relative hidden w-1/2 lg:block",
          fitViewport ? "h-svh" : "min-h-svh",
        )}
      >
        <Image
          alt={heroAlt}
          className="object-cover"
          fill
          priority
          sizes="50vw"
          src={heroImage}
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
      <div
        className={cn(
          "flex w-full flex-col justify-center bg-[#f8f9fb] px-6 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24",
          fitViewport
            ? "h-svh overflow-hidden py-6 lg:py-8"
            : "min-h-svh py-10",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full max-w-[420px]",
            fitViewport &&
              "max-h-full overflow-y-auto overscroll-contain lg:overflow-y-hidden",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthCenteredLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#f8f9fb] px-6 py-10">
      <div className="w-full max-w-[420px]">{children}</div>
    </div>
  );
}

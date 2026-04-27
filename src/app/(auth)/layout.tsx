import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          LogIQ WMS
        </p>
        <p className="text-xs text-muted-foreground">
          Warehouse management for 3PL teams and brands
        </p>
      </div>
      {children}
    </div>
  );
}

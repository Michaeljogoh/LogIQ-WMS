"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function OnboardingShell({
  children,
  workspaceName,
}: Readonly<{
  children: ReactNode;
  workspaceName?: string | null;
}>) {
  return (
    <div className="onboarding-shell flex min-h-svh flex-col">
      <header className="onboarding-shell-header">
        <Link className="onboarding-shell-brand" href="/dashboard">
          <div className="onboarding-shell-brand-icon">
            <Building2 className="size-4 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {workspaceName ?? "LogIQ WMS"}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Setup wizard
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            className="onboarding-shell-skip text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            href="/dashboard"
          >
            Skip for now
          </Link>
        </div>
      </header>
      <main className="onboarding-shell-main flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}

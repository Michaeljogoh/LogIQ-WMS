"use client";

import Link from "next/link";
import { PlatformClearAccountButton } from "@/components/platform/platform-account-actions";
import { Button } from "@/components/ui/button";

export function PlatformSupportBanner({
  accountName,
  supportLevel,
  expiresAt,
  reason,
}: Readonly<{
  accountName: string;
  supportLevel: "READ_ONLY" | "EMERGENCY_IMPERSONATION";
  expiresAt: Date;
  reason: string;
}>) {
  const isEmergency = supportLevel === "EMERGENCY_IMPERSONATION";

  return (
    <div
      className={
        isEmergency
          ? "border-b border-red-300 bg-red-600 px-4 py-2 text-sm text-white"
          : "border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      }
    >
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-2">
        <div>
          <p>
            {isEmergency ? (
              <>
                <span className="font-bold uppercase tracking-wide">
                  Emergency impersonation session
                </span>
                {" — "}
                You are viewing <span className="font-semibold">{accountName}</span>
                . All actions are logged.
              </>
            ) : (
              <>
                <span className="font-medium">Read-only support (Level 1)</span>
                {" — "}
                Viewing <span className="font-semibold">{accountName}</span>
                . Mutations are disabled.
              </>
            )}
          </p>
          <p className={isEmergency ? "text-xs text-red-100" : "text-xs text-muted-foreground"}>
            Reason: {reason} · Expires {expiresAt.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            className={isEmergency ? "border-white/40 text-white hover:bg-red-700" : undefined}
            size="sm"
            variant="outline"
          >
            <Link href="/platform/support">Support console</Link>
          </Button>
          <PlatformClearAccountButton />
        </div>
      </div>
    </div>
  );
}

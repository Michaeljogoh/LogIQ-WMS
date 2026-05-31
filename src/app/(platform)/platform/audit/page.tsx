import Link from "next/link";
import { PlatformAuditLog } from "@/components/platform/platform-audit-log";
import { Button } from "@/components/ui/button";

export default function PlatformAuditPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide activity — API mutations by all roles, plus support
            sessions and escalated actions. Filter and sort by role, tenant, or
            source.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/platform/support">Support console</Link>
        </Button>
      </div>
      <PlatformAuditLog />
    </div>
  );
}

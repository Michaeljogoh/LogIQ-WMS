import { PlatformSupportConsole } from "@/components/platform/platform-support-console";

export default function PlatformSupportPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">
          Tiered platform support — read-only by default, escalated fixes, and
          owner-approved emergency impersonation.
        </p>
      </div>
      <PlatformSupportConsole />
    </div>
  );
}

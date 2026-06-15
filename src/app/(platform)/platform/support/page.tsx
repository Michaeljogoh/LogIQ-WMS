import { PlatformSupportConsole } from "@/components/platform/platform-support-console";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";

export default function PlatformSupportPage() {
  return (
    <div className="space-y-8 p-6">
      <OperatorPageHeader
        title="Support"
        description="Tiered platform support — read-only by default, escalated fixes, and owner-approved emergency impersonation."
      />
      <PlatformSupportConsole />
    </div>
  );
}

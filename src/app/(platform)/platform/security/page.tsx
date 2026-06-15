import { PlatformUserAccessPanel } from "@/components/platform/platform-user-access-panel";
import { TwoFactorSettingsCard } from "@/components/settings/two-factor-settings-card";
import { PageHeader } from "@/components/shared/page-header";

export default function PlatformSecurityPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        description="Platform admin protection and cross-tenant user access management."
        title="Security"
      />

      <TwoFactorSettingsCard />

      <PlatformUserAccessPanel />
    </div>
  );
}

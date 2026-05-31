import { PlatformUserAccessPanel } from "@/components/platform/platform-user-access-panel";
import { TwoFactorSettingsCard } from "@/components/settings/two-factor-settings-card";

export default function PlatformSecurityPage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground">
          Platform admin protection and cross-tenant user access management.
        </p>
      </div>

      <TwoFactorSettingsCard />

      <PlatformUserAccessPanel />
    </div>
  );
}

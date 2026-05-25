import { TwoFactorSettingsCard } from "@/components/settings/two-factor-settings-card";

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground">
          Manage sign-in protection for your account.
        </p>
      </div>
      <TwoFactorSettingsCard />
    </div>
  );
}

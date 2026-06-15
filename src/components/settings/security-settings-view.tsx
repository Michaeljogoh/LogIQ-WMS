"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { TwoFactorSettingsCard } from "@/components/settings/two-factor-settings-card";
import { PageHeader } from "@/components/shared/page-header";

const PROTECTION_TIPS = [
  {
    title: "Email verification codes",
    body: "Each sign-in sends a one-time code to your registered email address.",
  },
  {
    title: "Keep 2FA enabled",
    body: "Two-factor authentication is the strongest protection for warehouse operator accounts.",
  },
  {
    title: "Use a strong password",
    body: "Combine a unique password with 2FA so lost credentials cannot be reused elsewhere.",
  },
] as const;

export function SecuritySettingsView() {
  const trpc = useTRPC();
  const statusQuery = useQuery(trpc.security.getTwoFactorStatus.queryOptions());
  const enabled = statusQuery.data?.twoFactorEnabled === true;
  const isLoading = statusQuery.isLoading;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        description="Manage sign-in protection, two-factor authentication, and account security for your operator workspace."
        title="Security"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent={enabled ? "success" : "warning"}
          hint={enabled ? "Active on every sign-in" : "Turn on to protect your account"}
          icon={enabled ? ShieldCheck : ShieldOff}
          isLoading={isLoading}
          label="Two-factor auth"
          value={enabled ? "Enabled" : "Disabled"}
        />
        <KpiStatCard
          accent="navy-blue"
          hint="One-time code per sign-in attempt"
          icon={Mail}
          isLoading={isLoading}
          label="Verification method"
          value="Email OTP"
        />
        <KpiStatCard
          accent={enabled ? "navy-teal" : "navy"}
          hint={
            enabled
              ? "Password + email code required"
              : "Password only — enable 2FA to harden"
          }
          icon={Shield}
          isLoading={isLoading}
          label="Sign-in protection"
          value={enabled ? "Strong" : "Basic"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
        <TwoFactorSettingsCard
          onStatusChange={() => void statusQuery.refetch()}
        />

        <aside className="space-y-4">
          <div className="security-info-panel">
            <div className="security-info-panel-header">
              <Shield className="size-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold text-foreground">
                Sign-in protection
              </p>
            </div>
            <ul className="space-y-3">
              {PROTECTION_TIPS.map((tip) => (
                <li className="security-info-item" key={tip.title}>
                  <p className="text-sm font-medium text-foreground">
                    {tip.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {tip.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="security-status-banner">
            <div
              className={
                enabled
                  ? "security-status-banner-icon security-status-banner-icon--active"
                  : "security-status-banner-icon security-status-banner-icon--inactive"
              }
            >
              {enabled ? (
                <ShieldCheck className="size-5" aria-hidden />
              ) : (
                <ShieldOff className="size-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {enabled ? "Your account is protected" : "Protection is off"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {enabled
                  ? "Two-factor authentication is required when you sign in to this workspace."
                  : "Enable two-factor authentication to require an email code on every sign-in."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

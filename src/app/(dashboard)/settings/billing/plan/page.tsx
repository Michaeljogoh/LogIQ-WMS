"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Crown, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTRPC } from "@/app/trpc/client";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    plan: "STARTER" as const,
    title: "Starter",
    price: "$49/mo",
    blurb: "500 orders/mo · 1 warehouse · 5 merchants · core WMS",
    accent: "navy" as const,
    icon: Rocket,
  },
  {
    plan: "GROWTH" as const,
    title: "Growth",
    price: "$149/mo",
    blurb: "5,000 orders/mo · 3 warehouses · 25 merchants · LogIQ AI",
    accent: "navy-blue" as const,
    icon: Sparkles,
  },
  {
    plan: "ENTERPRISE" as const,
    title: "Enterprise",
    price: "Custom",
    blurb: "Unlimited scale · SLA · dedicated onboarding",
    accent: "navy-violet" as const,
    icon: Crown,
  },
];

const PLAN_GRADIENT: Record<(typeof PLANS)[number]["accent"], string> = {
  navy: "kpi-gradient-navy",
  "navy-blue": "kpi-gradient-navy-blue",
  "navy-violet": "kpi-gradient-navy-violet",
};

export default function BillingPlanPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const profileQuery = useQuery(trpc.operatorProfile.queryOptions());
  const usageQuery = useQuery(trpc.billing.getUsage.queryOptions());

  const checkoutMut = useMutation(
    trpc.billing.createCheckout.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
    }),
  );

  const current = usageQuery.data?.plan;

  useEffect(() => {
    if (!profileQuery.isSuccess || !profileQuery.data?.profile) {
      return;
    }
    const role = profileQuery.data.profile.systemRole;
    if (role !== "THREEPL_ACCOUNT_OWNER" && role !== "PLATFORM_ADMIN") {
      router.replace("/dashboard");
    }
  }, [profileQuery.isSuccess, profileQuery.data, router]);

  return (
    <SettingsPage>
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/billing">Back to billing</Link>
          </Button>
        }
        description="Choose or change your subscription via Polar checkout. Use the same organisation account you are signed in with."
        title="Plan"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const isCurrent = current === p.plan;
          return (
            <article
              className={cn(
                "settings-plan-card",
                isCurrent && "settings-plan-card--current",
              )}
              key={p.plan}
            >
              <div
                className={cn(
                  "settings-plan-card-header",
                  PLAN_GRADIENT[p.accent],
                  "text-white",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-white/75">
                      {p.plan}
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight">
                      {p.title}
                    </h2>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {p.price}
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="size-5 text-white" aria-hidden />
                  </div>
                </div>
                {isCurrent ? (
                  <Badge className="mt-3 border-white/25 bg-white/15 text-white">
                    <Check className="size-3" aria-hidden />
                    Current plan
                  </Badge>
                ) : null}
              </div>
              <div className="settings-plan-card-body">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.blurb}
                </p>
              </div>
              <div className="settings-plan-card-footer">
                <Button
                  className="w-full min-h-11"
                  disabled={
                    checkoutMut.isPending ||
                    (p.plan === "ENTERPRISE" &&
                      !usageQuery.data?.enterpriseProductConfigured) ||
                    isCurrent
                  }
                  onClick={() =>
                    checkoutMut.mutate({
                      targetPlan: p.plan,
                    })
                  }
                  type="button"
                  variant={isCurrent ? "secondary" : "default"}
                >
                  {p.plan === "ENTERPRISE" &&
                  !usageQuery.data?.enterpriseProductConfigured
                    ? "Contact sales"
                    : isCurrent
                      ? "Current plan"
                      : "Checkout"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Plan limits apply immediately after checkout. Polar webhooks sync subscription status to your organisation."
          title="Billing notes"
        />
      </SettingsPanel>
    </SettingsPage>
  );
}

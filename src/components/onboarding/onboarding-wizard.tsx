"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CreditCard,
  MapPin,
  Sparkles,
  UserPlus,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/app/trpc/client";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const warehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
});

type WarehouseForm = z.infer<typeof warehouseSchema>;

function formatPlanLabel(plan: string): string {
  if (!plan) return "—";
  const rest = plan.slice(1).toLowerCase().replaceAll("_", " ");
  return plan.charAt(0).toUpperCase() + rest;
}

const TEAM_NEXT_STEPS = [
  {
    icon: UserPlus,
    title: "Invite warehouse managers",
    body: "Add people who can configure routing, packaging, and operations.",
  },
  {
    icon: Warehouse,
    title: "Assign warehouse access",
    body: "Limit staff to the sites they work from after inviting them.",
  },
  {
    icon: Sparkles,
    title: "Connect merchants",
    body: "Onboard client brands once your team and warehouse are ready.",
  },
] as const;

export function OnboardingWizard() {
  const trpc = useTRPC();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const profileQuery = useQuery(trpc.operatorProfile.queryOptions());

  const createWarehouse = useMutation(
    trpc.warehouse.create.mutationOptions({
      onSuccess: () => {
        toast.success("Warehouse created");
        setStep(2);
      },
      onError: (e) => {
        toast.error(e.message ?? "Could not create warehouse");
      },
    }),
  );

  const form = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      code: "",
      addressLine1: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const accountName = profileQuery.data?.account?.name ?? "—";
  const accountPlan = profileQuery.data?.account?.plan ?? "—";
  const planLabel = formatPlanLabel(accountPlan);

  return (
    <div className="onboarding-page mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <div className="onboarding-page-intro space-y-2">
        <Badge className="rounded-md" variant="info">
          Step {step + 1} of 3
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {step === 0
            ? "Welcome — let’s set up your workspace"
            : step === 1
              ? "Create your first warehouse"
              : "You’re ready to invite your team"}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {step === 0
            ? "Confirm your organisation details, add a warehouse, then invite managers and staff."
            : step === 1
              ? "Create the primary site you operate from. You can add more locations later in settings."
              : "Invite warehouse managers and staff from Settings → Users when you are ready."}
        </p>
      </div>

      <div className="onboarding-layout grid flex-1 gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <OnboardingStepper currentStep={step} />
          <div className="onboarding-tip-panel hidden lg:block">
            <p className="text-sm font-semibold text-foreground">Quick tip</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {step === 0
                ? "Your organisation and plan are already provisioned. You only need to add operational details."
                : step === 1
                  ? "Use a short warehouse code — it appears on labels, transfers, and internal reports."
                  : "You can finish setup now and invite teammates later from Settings → Users."}
            </p>
          </div>
        </aside>

        <div className="onboarding-panel">
          {step === 0 ? (
            <div className="space-y-5">
              <header className="onboarding-panel-header">
                <div className="onboarding-panel-icon">
                  <Building2 className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    Account
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your organisation is ready. Confirm details before adding a
                    warehouse.
                  </p>
                </div>
              </header>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="onboarding-stat-card">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Organisation
                  </p>
                  <p className="mt-2 text-lg font-bold tracking-tight text-foreground">
                    {profileQuery.isLoading ? "—" : accountName}
                  </p>
                </div>
                <div className="onboarding-stat-card onboarding-stat-card--accent">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Plan
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold tracking-tight text-foreground">
                      {profileQuery.isLoading ? "—" : planLabel}
                    </p>
                    {!profileQuery.isLoading && accountPlan !== "—" ? (
                      <Badge variant="secondary">{accountPlan}</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="onboarding-upgrade-banner">
                <div className="onboarding-upgrade-banner-icon">
                  <CreditCard className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Need more capacity?
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Upgrade to a paid plan for higher limits, SLA support, and
                    dedicated onboarding.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/settings/billing/plan">View plans</Link>
                </Button>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/60 pt-5 sm:flex-row">
                <Button className="gap-2" onClick={() => setStep(1)} type="button">
                  Continue
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button asChild variant="outline">
                  <Link href="/settings/billing/plan">Choose paid plan (Polar)</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <header className="onboarding-panel-header">
                <div className="onboarding-panel-icon">
                  <Warehouse className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    First warehouse
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Create the primary site you operate from. You can add more
                    later in settings.
                  </p>
                </div>
              </header>

              <form
                className="space-y-5"
                onSubmit={form.handleSubmit((values) =>
                  createWarehouse.mutate(values),
                )}
              >
                <section className="dashboard-form-section space-y-4">
                  <p className="text-sm font-semibold text-foreground">
                    Warehouse identity
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Main DC" {...form.register("name")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Code</Label>
                      <Input id="code" placeholder="MAIN" {...form.register("code")} />
                    </div>
                  </div>
                </section>

                <section className="dashboard-form-section space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MapPin className="size-4 text-muted-foreground" aria-hidden />
                    Location
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Address</Label>
                      <Input
                        id="addressLine1"
                        placeholder="123 Warehouse Blvd"
                        {...form.register("addressLine1")}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" {...form.register("city")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" {...form.register("state")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip">ZIP</Label>
                        <Input id="zip" {...form.register("zip")} />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-2 border-t border-border/60 pt-5 sm:flex-row">
                  <Button
                    onClick={() => setStep(0)}
                    type="button"
                    variant="outline"
                  >
                    Back
                  </Button>
                  <Button disabled={createWarehouse.isPending} type="submit">
                    Save warehouse
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <header className="onboarding-panel-header">
                <div
                  className={cn(
                    "onboarding-panel-icon",
                    "onboarding-panel-icon--success",
                  )}
                >
                  <Sparkles className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    Invite team
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your warehouse is set up. Invite managers and staff when you
                    are ready.
                  </p>
                </div>
              </header>

              <ul className="space-y-3">
                {TEAM_NEXT_STEPS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li className="onboarding-next-step" key={item.title}>
                      <div className="onboarding-next-step-icon">
                        <Icon className="size-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {item.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-col gap-2 border-t border-border/60 pt-5 sm:flex-row">
                <Button asChild className="gap-2">
                  <Link href="/settings/users">
                    Open users
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  onClick={() => {
                    router.push("/dashboard");
                    router.refresh();
                  }}
                  type="button"
                  variant="outline"
                >
                  Go to dashboard
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

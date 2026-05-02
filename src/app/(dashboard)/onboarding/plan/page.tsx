"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PLANS = [
  {
    plan: "STARTER" as const,
    title: "Starter",
    price: "$49/mo",
    blurb: "500 orders/mo · 1 warehouse · 5 merchants",
  },
  {
    plan: "GROWTH" as const,
    title: "Growth",
    price: "$149/mo",
    blurb: "5,000 orders/mo · 3 warehouses · 25 merchants",
  },
  {
    plan: "ENTERPRISE" as const,
    title: "Enterprise",
    price: "Custom",
    blurb: "Unlimited · SLA · dedicated onboarding",
  },
];

export default function OnboardingPlanPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const profileQuery = useQuery(trpc.operatorProfile.queryOptions());

  const checkoutMut = useMutation(
    trpc.billing.createCheckout.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
    }),
  );

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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Choose your plan
        </h1>
        <p className="text-sm text-muted-foreground">
          Start on Starter or Growth via Polar. You can change plans later in
          settings.
        </p>
        <Button className="w-fit" variant="ghost" asChild>
          <Link href="/onboarding">Back to onboarding</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.plan}>
            <CardHeader>
              <CardTitle>{p.title}</CardTitle>
              <CardDescription>{p.price}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {p.blurb}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full min-h-11"
                disabled={checkoutMut.isPending || p.plan === "ENTERPRISE"}
                onClick={() => checkoutMut.mutate({ targetPlan: p.plan })}
                type="button"
              >
                {p.plan === "ENTERPRISE"
                  ? "Contact sales"
                  : "Continue to checkout"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

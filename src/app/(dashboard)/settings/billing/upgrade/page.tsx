"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
    blurb: "500 orders/mo · 1 warehouse · 5 merchants · core WMS",
  },
  {
    plan: "GROWTH" as const,
    title: "Growth",
    price: "$149/mo",
    blurb: "5,000 orders/mo · 3 warehouses · 25 merchants · LogIQ AI",
  },
  {
    plan: "ENTERPRISE" as const,
    title: "Enterprise",
    price: "Custom",
    blurb: "Unlimited scale · SLA · dedicated onboarding",
  },
];

export default function BillingUpgradePage() {
  const trpc = useTRPC();
  const usageQuery = useQuery(trpc.billing.getUsage.queryOptions());

  const checkoutMut = useMutation(
    trpc.billing.createCheckout.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
    }),
  );

  const current = usageQuery.data?.plan;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Upgrade plan</h1>
          <p className="text-sm text-muted-foreground">
            You will be redirected to Polar checkout. Use the same organisation
            account you are signed in with.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/billing">Back to billing</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card
            key={p.plan}
            className={current === p.plan ? "border-primary" : ""}
          >
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
                disabled={
                  checkoutMut.isPending ||
                  (p.plan === "ENTERPRISE" &&
                    !usageQuery.data?.enterpriseProductConfigured) ||
                  current === p.plan
                }
                onClick={() =>
                  checkoutMut.mutate({
                    targetPlan: p.plan,
                  })
                }
                type="button"
              >
                {p.plan === "ENTERPRISE" &&
                !usageQuery.data?.enterpriseProductConfigured
                  ? "Contact sales"
                  : current === p.plan
                    ? "Current plan"
                    : "Checkout"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

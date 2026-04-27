"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const warehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
});

type WarehouseForm = z.infer<typeof warehouseSchema>;

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

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex gap-2 text-xs font-medium text-muted-foreground">
        <span className={step >= 0 ? "text-foreground" : ""}>1. Account</span>
        <span>→</span>
        <span className={step >= 1 ? "text-foreground" : ""}>2. Warehouse</span>
        <span>→</span>
        <span className={step >= 2 ? "text-foreground" : ""}>3. Team</span>
      </div>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Your organisation is ready. Confirm details before adding a
              warehouse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Organisation:</span>{" "}
              {profileQuery.data?.account?.name ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Plan:</span>{" "}
              {profileQuery.data?.account?.plan ?? "—"}
            </p>
            <Button className="mt-4" onClick={() => setStep(1)} type="button">
              Continue
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>First warehouse</CardTitle>
            <CardDescription>
              Create the primary site you operate from. You can add more later
              in settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) =>
                createWarehouse.mutate(values),
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...form.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" {...form.register("code")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address</Label>
                <Input id="addressLine1" {...form.register("addressLine1")} />
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
              <div className="flex gap-2 pt-2">
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
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite team</CardTitle>
            <CardDescription>
              Invite warehouse managers and staff from Settings → Users when you
              are ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/settings/users">Open users</Link>
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

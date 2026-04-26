"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function OperatorSignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: "/dashboard",
      });
      if (error) {
        toast.error(error.message ?? "Sign-in failed");
        return;
      }
      toast.success("Signed in");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function signInGoogle() {
    setPending(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } finally {
      setPending(false);
    }
  }

  async function signInUps() {
    setPending(true);
    try {
      await authClient.signIn.oauth2({
        providerId: "ups",
        callbackURL: "/dashboard",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Sign in
        </CardTitle>
        <CardDescription>
          3PL operator access — email, Google, or UPS OAuth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <Button className="w-full" disabled={pending} type="submit">
            Continue
          </Button>
        </form>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            disabled={pending}
            onClick={() => void signInGoogle()}
            type="button"
            variant="outline"
          >
            Google
          </Button>
          <Button
            disabled={pending}
            onClick={() => void signInUps()}
            type="button"
            variant="outline"
          >
            UPS
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <span>
          New operator?{" "}
          <Link className="text-foreground underline" href="/sign-up">
            Create account
          </Link>
        </span>
        <span>
          Merchant?{" "}
          <Link className="text-foreground underline" href="/merchant/sign-in">
            Merchant portal sign-in
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}

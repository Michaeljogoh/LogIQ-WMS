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

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "org"}-${Math.random().toString(36).slice(2, 8)}`;
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
});

type FormValues = z.infer<typeof schema>;

export function OperatorSignUpForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      organizationName: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const { error: signUpError } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      });
      if (signUpError) {
        toast.error(signUpError.message ?? "Sign-up failed");
        return;
      }

      const slug = slugify(values.organizationName);

      const { error: orgError } = await authClient.organization.create({
        name: values.organizationName,
        slug,
        keepCurrentActiveOrganization: true,
      });

      if (orgError) {
        toast.error(orgError.message ?? "Could not create organization");
        return;
      }

      toast.success("Account created.");
      router.push("/sign-in");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Create operator account
        </CardTitle>
        <CardDescription>
          Register your 3PL organisation and first admin user.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organisation name</Label>
            <Input
              id="organizationName"
              {...form.register("organizationName")}
            />
            {form.formState.errors.organizationName ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.organizationName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
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
              autoComplete="new-password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <Button className="w-full" disabled={pending} type="submit">
            Create account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="pl-1 text-foreground underline" href="/sign-in">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

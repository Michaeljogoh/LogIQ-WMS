"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AUTH_HERO_IMAGES } from "@/components/auth/auth-assets";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { handlePostPasswordSignIn } from "@/lib/handle-post-sign-in";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function SignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error(error.message ?? "Sign-in failed");
        return;
      }
      if (
        data &&
        typeof data === "object" &&
        "twoFactorRedirect" in data &&
        data.twoFactorRedirect
      ) {
        router.push("/two-factor");
        return;
      }
      toast.success("Signed in");
      await handlePostPasswordSignIn({ router });
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
    <AuthSplitLayout
      fitViewport
      heroAlt="Warehouse workspace"
      heroImage={AUTH_HERO_IMAGES.signIn}
    >
      <AuthHeader
        description="Sign in with your LogIQ WMS account"
        title="Sign in"
      />

      <AuthSocialButtons
        disabled={pending}
        mode="sign-in"
        onGoogle={() => void signInGoogle()}
        onUps={() => void signInUps()}
      />

      <AuthDivider />

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <AuthField
          autoComplete="email"
          error={form.formState.errors.email?.message}
          icon={User}
          label="Email address"
          placeholder="name@example.com"
          type="email"
          {...form.register("email")}
        />
        <AuthPasswordField
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          label="Password"
          placeholder="Password"
          {...form.register("password")}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.watch("remember")}
              id="remember"
              onCheckedChange={(checked) =>
                form.setValue("remember", checked === true)
              }
            />
            <Label
              className="text-sm font-normal text-[#64748b]"
              htmlFor="remember"
            >
              Remember me
            </Label>
          </div>
          <Link
            className="text-sm font-medium text-[#4a7dff] hover:underline"
            href="/forgot-password"
          >
            Forgot Password?
          </Link>
        </div>

        <AuthPrimaryButton disabled={pending} type="submit">
          Sign In
        </AuthPrimaryButton>
      </form>

      <p className="mt-4 text-center text-sm text-[#64748b]">
        <Link
          className="font-medium text-[#4a7dff] hover:underline"
          href="/sign-up"
        >
          Create an account
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

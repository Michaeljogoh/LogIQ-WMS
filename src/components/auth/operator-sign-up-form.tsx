"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
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
import {
  enableTwoFactorWithPassword,
  sendTwoFactorOtp,
} from "@/lib/two-factor-enrollment";

const schema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    acceptTerms: z.boolean().refine((value) => value === true, {
      message: "You must accept the terms",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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
      confirmPassword: "",
      acceptTerms: false,
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

      const { error: signInError } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (signInError) {
        toast.error(signInError.message ?? "Account created but sign-in failed");
        router.push("/sign-in");
        return;
      }

      await enableTwoFactorWithPassword(values.password);
      await sendTwoFactorOtp();

      toast.success("Enter the verification code sent to your email.");
      router.push("/two-factor/enroll");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function onSignUpUps() {
    toast.message("Use the email form below to create your account.");
  }

  return (
    <AuthSplitLayout
      fitViewport
      heroAlt="Warehouse aisle with pallet racks and shipping boxes"
      heroImage={AUTH_HERO_IMAGES.signUp}
    >
      <AuthHeader
        compact
        description="Create your account today"
        title="Sign Up"
      />

      <AuthSocialButtons
        compact
        disabled={pending}
        mode="sign-up"
        onGoogle={() =>
          toast.message("Use the email form below to create your account.")
        }
        onUps={onSignUpUps}
      />

      <AuthDivider compact />

      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <AuthField
          error={form.formState.errors.name?.message}
          label="Name"
          placeholder="Your full name"
          {...form.register("name")}
        />
        <AuthField
          autoComplete="email"
          error={form.formState.errors.email?.message}
          icon={User}
          label="Email address"
          placeholder="name@example.com"
          type="email"
          {...form.register("email")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <AuthPasswordField
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            label="Password"
            placeholder="Password"
            {...form.register("password")}
          />
          <AuthPasswordField
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword?.message}
            label="Confirm password"
            placeholder="Confirm password"
            {...form.register("confirmPassword")}
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            checked={form.watch("acceptTerms") === true}
            id="acceptTerms"
            onCheckedChange={(checked) =>
              form.setValue("acceptTerms", checked === true)
            }
          />
          <Label
            className="text-sm leading-snug font-normal text-[#64748b]"
            htmlFor="acceptTerms"
          >
            I accept the{" "}
            <span className="text-[#4a7dff]">terms</span> and{" "}
            <span className="text-[#4a7dff]">privacy policy</span>
          </Label>
        </div>
        {form.formState.errors.acceptTerms ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.acceptTerms.message}
          </p>
        ) : null}

        <AuthPrimaryButton disabled={pending} type="submit">
          Sign up
        </AuthPrimaryButton>
      </form>

      <p className="mt-4 text-center text-sm text-[#64748b]">
        <Link
          className="font-medium text-[#4a7dff] hover:underline"
          href="/sign-in"
        >
          Sign in to an existing account
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

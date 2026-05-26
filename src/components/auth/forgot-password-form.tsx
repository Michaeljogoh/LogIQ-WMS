"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AUTH_HERO_IMAGES } from "@/components/auth/auth-assets";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthInlineSendButton } from "@/components/auth/auth-social-buttons";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo,
      });
      if (error) {
        toast.error(error.message ?? "Could not send reset email");
        return;
      }
      setSent(true);
      toast.success(
        `If an account exists for ${values.email}, we sent a reset link.`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplitLayout
      heroAlt="Forgot password"
      heroImage={AUTH_HERO_IMAGES.forgotPassword}
    >
      <AuthHeader
        description="Enter your email below and we will send you a reset link."
        title="Forgot your password?"
      />

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex gap-2">
          <input
            aria-label="Email"
            className={cn(
              "h-11 min-w-0 flex-1 rounded-lg border border-[#e2e8f0] bg-white px-4 text-sm text-[#1e293b] outline-none placeholder:text-[#94a3b8] focus:border-[#4a7dff] focus:ring-2 focus:ring-[#4a7dff]/20",
              form.formState.errors.email && "border-destructive",
            )}
            disabled={sent}
            placeholder="Email"
            type="email"
            {...form.register("email")}
          />
          <AuthInlineSendButton disabled={pending || sent}>
            {sent ? "Sent" : "Send"}
          </AuthInlineSendButton>
        </div>
        {form.formState.errors.email ? (
          <p className="mt-2 text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </form>

      <p className="mt-8 text-center">
        <Link
          className="text-sm font-semibold text-[#4a7dff] hover:underline"
          href="/sign-in"
        >
          Back to sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

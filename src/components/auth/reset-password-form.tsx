"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthCenteredLayout } from "@/components/auth/auth-split-layout";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (tokenError === "INVALID_TOKEN") {
      toast.error("This reset link is invalid or has expired.");
    }
  }, [tokenError]);

  async function onSubmit(values: FormValues) {
    if (!token) {
      toast.error(
        "Missing reset token. Request a new link from forgot password.",
      );
      return;
    }

    setPending(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });
      if (error) {
        toast.error(error.message ?? "Could not reset password");
        return;
      }
      toast.success(
        "Password updated. You can sign in with your new password.",
      );
      router.push("/sign-in");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <AuthCenteredLayout>
        <AuthHeader
          description="Request a new link from the forgot password page."
          title="Invalid or expired link"
        />
        <p className="text-center text-sm text-[#64748b]">
          <Link
            className="font-medium text-[#4a7dff] hover:underline"
            href="/forgot-password"
          >
            Request a new reset link
          </Link>
        </p>
      </AuthCenteredLayout>
    );
  }

  return (
    <AuthCenteredLayout>
      <AuthHeader
        description="Type your new password"
        title="Reset new password"
      />

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <AuthPasswordField
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          label="New password"
          placeholder="Type new password"
          showKeyIcon={false}
          {...form.register("password")}
        />
        <AuthPasswordField
          autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message}
          label="Confirm password"
          placeholder="Confirm new password"
          showKeyIcon={false}
          {...form.register("confirmPassword")}
        />
        <AuthPrimaryButton disabled={pending} type="submit">
          Set Password
        </AuthPrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#64748b]">
        <Link
          className="font-medium text-[#4a7dff] hover:underline"
          href="/sign-in"
        >
          Back to sign in
        </Link>
      </p>
    </AuthCenteredLayout>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}

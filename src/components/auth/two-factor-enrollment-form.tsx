"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/app/trpc/client";
import { TwoFactorCodeForm } from "@/components/auth/two-factor-code-form";
import { authClient } from "@/lib/auth-client";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";

export function TwoFactorEnrollmentForm() {
  const router = useRouter();
  const trpc = useTRPC();
  const completeSetup = useMutation(
    trpc.security.completeTwoFactorSetup.mutationOptions(),
  );

  async function onVerified() {
    await completeSetup.mutateAsync();
    await authClient.getSession();
    toast.success("Two-factor authentication is enabled.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <TwoFactorCodeForm
      description="Operator accounts must enable two-factor authentication before continuing."
      onVerified={onVerified}
      sendOtpOnMount={false}
      showBackToSignIn={false}
      submitLabel="Continue to dashboard"
      title="Secure your operator account"
    />
  );
}

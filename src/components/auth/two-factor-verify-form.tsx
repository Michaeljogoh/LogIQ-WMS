"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { TwoFactorCodeForm } from "@/components/auth/two-factor-code-form";
import { authClient, type SessionUser } from "@/lib/auth-client";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";

function TwoFactorVerifyFormInner() {
  const router = useRouter();
  const trpc = useTRPC();
  const completeSetup = useMutation(
    trpc.security.completeTwoFactorSetup.mutationOptions(),
  );

  async function onVerified() {
    const session = await authClient.getSession();
    const user = session.data?.user as SessionUser | undefined;

    if (user && user.twoFactorSetupCompleted !== true) {
      await completeSetup.mutateAsync();
    }

    toast.success("Signed in");
    router.push(resolvePostAuthRedirect(user));
    router.refresh();
  }

  return (
    <TwoFactorCodeForm
      onVerified={onVerified}
      sendOtpOnMount
      showBackToSignIn
      submitLabel="Verify"
      title="Enter the verification code"
    />
  );
}

export function TwoFactorVerifyForm() {
  return (
    <Suspense fallback={null}>
      <TwoFactorVerifyFormInner />
    </Suspense>
  );
}

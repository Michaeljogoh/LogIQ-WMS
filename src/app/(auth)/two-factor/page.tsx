import { Suspense } from "react";
import { TwoFactorVerifyForm } from "@/components/auth/two-factor-verify-form";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TwoFactorVerifyForm />
    </Suspense>
  );
}

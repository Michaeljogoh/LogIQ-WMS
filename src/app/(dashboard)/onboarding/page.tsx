import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { systemRole?: string } | undefined)
    ?.systemRole;

  if (role !== "THREEPL_ACCOUNT_OWNER" && role !== "PLATFORM_ADMIN") {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}

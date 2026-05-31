import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireOperatorAccountOwnerPage } from "@/server/helpers/require-operator-account-owner-page";

export default async function Page() {
  await requireOperatorAccountOwnerPage();
  return <OnboardingWizard />;
}

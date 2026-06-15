import { redirect } from "next/navigation";

export default function OnboardingPlanRedirectPage() {
  redirect("/settings/billing/plan");
}

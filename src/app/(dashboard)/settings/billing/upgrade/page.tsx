import { redirect } from "next/navigation";

export default function BillingUpgradeRedirectPage() {
  redirect("/settings/billing/plan");
}

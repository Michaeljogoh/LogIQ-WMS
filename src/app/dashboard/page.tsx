import { redirect } from "next/navigation";

/**
 * Legacy compatibility route.
 * Canonical dashboard shell lives at `/` under `app/(dashboard)/page.tsx`.
 */
export default function DashboardRedirectPage() {
  redirect("/");
}

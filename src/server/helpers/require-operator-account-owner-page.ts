import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isOperatorAccountOwner } from "@/lib/operator-permissions";

/** Redirects warehouse managers and staff away from account-owner-only pages. */
export async function requireOperatorAccountOwnerPage(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { systemRole?: string } | undefined)?.systemRole;

  if (!isOperatorAccountOwner(role)) {
    redirect("/dashboard");
  }
}

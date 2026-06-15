import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOperatorWorkspaceForUser } from "@/server/helpers/ensure-operator-workspace";
import { buildSessionTenantFields } from "@/server/helpers/session-enrichment";

export default async function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  const sessionUser = session.user as {
    id: string;
    accountId?: string | null;
    systemRole?: string | null;
  };

  let tenant =
    sessionUser.accountId && sessionUser.systemRole
      ? {
          accountId: sessionUser.accountId,
          systemRole: sessionUser.systemRole,
        }
      : await buildSessionTenantFields(sessionUser.id);

  if (!tenant) {
    tenant = await ensureOperatorWorkspaceForUser(sessionUser.id);
  }

  const systemRole = tenant?.systemRole ?? sessionUser.systemRole ?? null;

  if (
    systemRole === "MERCHANT_OWNER" ||
    systemRole === "MERCHANT_USER"
  ) {
    redirect("/portal/dashboard");
  }

  if (systemRole === "PLATFORM_ADMIN") {
    redirect("/platform/dashboard");
  }

  const account = tenant?.accountId
    ? await db.logiqAccount.findUnique({
        where: { id: tenant.accountId },
        select: { name: true },
      })
    : null;

  return (
    <OnboardingShell workspaceName={account?.name ?? "LogIQ WMS"}>
      {children}
    </OnboardingShell>
  );
}

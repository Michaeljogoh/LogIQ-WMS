import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { NotificationBell } from "@/components/shared/notification-bell";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOperatorWorkspaceForUser } from "@/server/helpers/ensure-operator-workspace";
import { buildSessionTenantFields } from "@/server/helpers/session-enrichment";

export default async function DashboardLayout({
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
    name?: string | null;
    email?: string | null;
    image?: string | null;
    accountId?: string | null;
    systemRole?: string | null;
    merchantPermissions?: string[] | null;
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

  const user = {
    ...sessionUser,
    accountId: tenant?.accountId ?? sessionUser.accountId ?? null,
    systemRole: tenant?.systemRole ?? sessionUser.systemRole ?? null,
  };

  if (
    user.systemRole === "MERCHANT_OWNER" ||
    user.systemRole === "MERCHANT_USER"
  ) {
    redirect("/portal/dashboard");
  }

  const account = user.accountId
    ? await db.logiqAccount.findUnique({
        where: { id: user.accountId },
        select: { name: true, plan: true },
      })
    : null;

  const workspaceName = account?.name ?? "LogIQ WMS";
  const workspacePlan = account?.plan ?? "STARTER";

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: user.name?.trim() || "Operator",
          email: user.email ?? "",
          image: user.image,
        }}
        workspaceName={workspaceName}
        workspacePlan={workspacePlan}
        systemRole={user.systemRole ?? null}
        navContext="operator"
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-muted-foreground">
                  LogIQ WMS
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

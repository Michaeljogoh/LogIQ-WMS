import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
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
import type { MerchantPermission } from "@/config/dashboard-sidebar-config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSessionTenantFields } from "@/server/helpers/session-enrichment";

const PORTAL_ROLES = new Set([
  "MERCHANT_OWNER",
  "MERCHANT_USER",
  "PLATFORM_ADMIN",
  "THREEPL_ACCOUNT_OWNER",
]);

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  const sessionRole = (session.user as { systemRole?: string }).systemRole;
  if (sessionRole === "PLATFORM_ADMIN") {
    redirect("/platform/dashboard");
  }

  const sessionUser = session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    accountId?: string | null;
    systemRole?: string | null;
    merchantId?: string | null;
    merchantPermissions?: string[] | null;
  };

  const tenant = await buildSessionTenantFields(sessionUser.id);

  const systemRole = tenant?.systemRole ?? sessionUser.systemRole ?? null;
  const merchantId = tenant?.merchantId ?? sessionUser.merchantId ?? null;
  const accountId = tenant?.accountId ?? sessionUser.accountId ?? null;
  const merchantPermissions = (tenant?.merchantPermissions ??
    sessionUser.merchantPermissions ??
    []) as MerchantPermission[];

  if (systemRole && !PORTAL_ROLES.has(systemRole)) {
    redirect("/dashboard");
  }

  let workspaceName = "Merchant portal";
  if (merchantId && accountId) {
    const merchant = await db.merchant.findFirst({
      where: { id: merchantId, accountId },
      select: { name: true },
    });
    if (merchant?.name) {
      workspaceName = merchant.name;
    }
  } else if (accountId && systemRole === "PLATFORM_ADMIN") {
    const account = await db.logiqAccount.findUnique({
      where: { id: accountId },
      select: { name: true },
    });
    if (account?.name) {
      workspaceName = account.name;
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: sessionUser.name?.trim() || "Merchant",
          email: sessionUser.email ?? "",
          image: sessionUser.image,
        }}
        workspaceName={workspaceName}
        systemRole={systemRole}
        merchantId={merchantId}
        merchantPermissions={merchantPermissions}
        navContext="portal"
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
                  Merchant portal
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

"use client";

import { Building2Icon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type {
  MerchantPermission,
  SidebarNavContext,
} from "@/config/dashboard-sidebar-config";
import { authClient } from "@/lib/auth-client";
import {
  getDashboardHomeHref,
  getDashboardNavSections,
} from "@/lib/dashboard-sidebar";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

function formatPlanLabel(plan: string): string {
  if (!plan) return "";
  const rest = plan.slice(1).toLowerCase().replaceAll("_", " ");
  return plan.charAt(0).toUpperCase() + rest;
}

export function AppSidebar({
  user,
  workspaceName,
  workspacePlan,
  systemRole,
  merchantId = null,
  merchantPermissions = [],
  navContext = "operator",
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; image?: string | null };
  workspaceName: string;
  workspacePlan?: string;
  systemRole: string | null;
  merchantId?: string | null;
  merchantPermissions?: MerchantPermission[];
  navContext?: SidebarNavContext;
}) {
  const clientSession = authClient.useSession();
  const sessionUser = clientSession.data?.user as
    | {
        systemRole?: string | null;
        merchantId?: string | null;
        merchantPermissions?: string[] | null;
      }
    | undefined;

  const resolvedRole = systemRole ?? sessionUser?.systemRole ?? null;
  const resolvedMerchantId = merchantId ?? sessionUser?.merchantId ?? null;
  const resolvedMerchantPermissions =
    merchantPermissions.length > 0
      ? merchantPermissions
      : ((sessionUser?.merchantPermissions ?? []) as MerchantPermission[]);

  const sections = getDashboardNavSections(
    resolvedRole,
    resolvedMerchantPermissions,
    navContext,
    { merchantId: resolvedMerchantId },
  );
  const homeHref = getDashboardHomeHref(resolvedRole, navContext);
  const planLabel = workspacePlan ? formatPlanLabel(workspacePlan) : null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={workspaceName}>
              <Link href={homeHref}>
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Building2Icon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {workspaceName}
                  </span>
                  {planLabel ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {planLabel}
                    </span>
                  ) : null}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <NavMain sections={sections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={user}
          systemRole={resolvedRole}
          navContext={navContext}
          merchantPermissions={resolvedMerchantPermissions}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

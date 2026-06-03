"use client";

import {
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  RocketIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type {
  MerchantPermission,
  SidebarNavContext,
} from "@/config/dashboard-sidebar-config";
import { authClient } from "@/lib/auth-client";
import { isMerchantPortalRole } from "@/lib/dashboard-sidebar";
import {
  canManageOperatorBilling,
  canManageOperatorTeam,
} from "@/lib/operator-permissions";

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    const w = parts[0] ?? "";
    return w.length >= 2 ? w.slice(0, 2).toUpperCase() : w.toUpperCase();
  }
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function merchantHasPermission(
  permissions: MerchantPermission[],
  required: MerchantPermission,
): boolean {
  return permissions.includes(required);
}

export function NavUser({
  user,
  systemRole,
  navContext = "operator",
  merchantPermissions = [],
}: {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  systemRole: string | null;
  navContext?: SidebarNavContext;
  merchantPermissions?: MerchantPermission[];
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const initials = userInitials(user.name);

  const isPortal = navContext === "portal" || isMerchantPortalRole(systemRole);
  const showOperatorBilling =
    canManageOperatorBilling(systemRole) && systemRole !== "PLATFORM_ADMIN";
  const showPlatformHome = systemRole === "PLATFORM_ADMIN";
  const showMerchantBilling =
    isPortal &&
    (systemRole === "MERCHANT_OWNER" ||
      systemRole === "PLATFORM_ADMIN" ||
      merchantHasPermission(merchantPermissions, "BILLING"));
  const showMerchantTeam =
    isPortal &&
    (systemRole === "MERCHANT_OWNER" ||
      systemRole === "PLATFORM_ADMIN" ||
      merchantHasPermission(merchantPermissions, "WRITE"));
  const showOperatorTeam = !isPortal && canManageOperatorTeam(systemRole);

  const signOutRedirect = "/sign-in";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {showPlatformHome ? (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/platform/dashboard">
                      <RocketIcon />
                      Platform console
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}
            {showOperatorBilling ? (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/billing/plan">
                      <RocketIcon />
                      Upgrade plan
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}
            {showOperatorTeam || showMerchantTeam || showMerchantBilling ? (
              <DropdownMenuGroup>
                {showOperatorTeam ? (
                  <DropdownMenuItem asChild>
                    <Link href="/settings/users">
                      <UsersIcon />
                      Team
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {showMerchantTeam ? (
                  <DropdownMenuItem asChild>
                    <Link href="/portal/team">
                      <UsersIcon />
                      Team
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {showOperatorBilling ? (
                  <DropdownMenuItem asChild>
                    <Link href="/settings/billing">
                      <CreditCardIcon />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {showMerchantBilling ? (
                  <DropdownMenuItem asChild>
                    <Link href="/portal/billing">
                      <CreditCardIcon />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            ) : null}
            {(showOperatorTeam ||
              showMerchantTeam ||
              showMerchantBilling ||
              showOperatorBilling) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut();
                router.push(signOutRedirect);
                router.refresh();
              }}
            >
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

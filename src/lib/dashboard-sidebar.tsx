import type { LucideIcon } from "lucide-react";
import { createElement, type ReactNode } from "react";
import type { DashboardNavItem } from "@/components/dashboard/nav-main";
import {
  getSidebarSectionsForRole,
  type MerchantPermission,
  type SidebarNavContext,
  type SidebarNavSectionConfig,
} from "@/config/dashboard-sidebar-config";

export function mapSidebarSectionsToNav(
  sections: SidebarNavSectionConfig[],
): { label: string; items: DashboardNavItem[] }[] {
  return sections.map((section) => ({
    label: section.label,
    items: section.items.map((item) => ({
      title: item.title,
      url: item.url,
      icon: iconNode(item.icon),
      items: item.items,
    })),
  }));
}

function iconNode(Icon: LucideIcon): ReactNode {
  return createElement(Icon, { className: "size-4" });
}

export function getDashboardNavSections(
  systemRole: string | null | undefined,
  merchantPermissions: MerchantPermission[] = [],
  context: SidebarNavContext = "operator",
  options?: { merchantId?: string | null },
): { label: string; items: DashboardNavItem[] }[] {
  const sections = getSidebarSectionsForRole(
    systemRole,
    merchantPermissions,
    context,
    options,
  );
  return mapSidebarSectionsToNav(sections);
}

export function getDashboardHomeHref(
  _systemRole: string | null | undefined,
  context: SidebarNavContext = "operator",
): string {
  if (context === "portal") {
    return "/portal/dashboard";
  }
  return "/dashboard";
}

export function isMerchantPortalRole(
  systemRole: string | null | undefined,
): boolean {
  return systemRole === "MERCHANT_OWNER" || systemRole === "MERCHANT_USER";
}

export function canManageOperatorBilling(
  systemRole: string | null | undefined,
): boolean {
  return (
    systemRole === "THREEPL_ACCOUNT_OWNER" || systemRole === "PLATFORM_ADMIN"
  );
}

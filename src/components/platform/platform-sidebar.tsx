"use client";

import { Building2Icon } from "lucide-react";
import Link from "next/link";
import { platformNavSections } from "@/config/platform-sidebar-config";
import { NavMain } from "@/components/dashboard/nav-main";
import { NavUser } from "@/components/dashboard/nav-user";
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
import { createElement } from "react";

export function PlatformSidebar({
  user,
}: {
  user: { name: string; email: string; image?: string | null };
}) {
  const sections = platformNavSections.map((section) => ({
    label: section.label,
    items: section.items.map((item) => ({
      title: item.title,
      url: item.url,
      icon: createElement(item.icon, { className: "size-4" }),
    })),
  }));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/platform/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2Icon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">LogIQ Platform</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Internal console
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={sections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={user}
          systemRole="PLATFORM_ADMIN"
          navContext="operator"
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

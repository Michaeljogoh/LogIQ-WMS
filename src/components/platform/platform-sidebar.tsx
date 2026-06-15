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
    <Sidebar collapsible="icon" className="dashboard-sidebar">
      <SidebarHeader className="dashboard-sidebar-header-accent relative border-b border-sidebar-border/40 pb-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-14 rounded-none px-4 hover:bg-white/5"
            >
              <Link href="/platform/dashboard">
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 shadow-[0_0_12px_rgba(56,116,255,0.25)]">
                  <Building2Icon className="size-4 text-white" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight text-white">
                    LogIQ Platform
                  </span>
                  <span className="truncate text-[10px] font-medium uppercase tracking-wider text-white/60">
                    Internal console
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden py-2">
        <NavMain sections={sections} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/40 pt-0">
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

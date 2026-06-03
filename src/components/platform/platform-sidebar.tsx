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
      <SidebarHeader className="border-b border-sidebar-border/60 pb-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-14 rounded-none px-4 hover:bg-sidebar-accent/60"
            >
              <Link href="/platform/dashboard">
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10">
                  <Building2Icon className="size-4 text-sidebar-primary" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight">LogIQ Platform</span>
                  <span className="truncate text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/45">
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
      <SidebarFooter className="border-t border-sidebar-border/60 pt-0">
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

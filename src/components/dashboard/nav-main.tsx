"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  title: string;
  url: string;
  icon?: ReactNode;
  items?: { title: string; url: string }[];
};

function isNavActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function NavMain({
  sections,
}: {
  sections: { label: string; items: DashboardNavItem[] }[];
}) {
  const pathname = usePathname();

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.label} className="px-2 py-1">
          <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            {section.label}
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {section.items.map((item) => {
              const hasSubItems = Boolean(item.items?.length);
              const itemActive =
                isNavActive(pathname, item.url) ||
                item.items?.some((sub) => isNavActive(pathname, sub.url));

              if (!hasSubItems) {
                const active = isNavActive(pathname, item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={active}
                      className={cn(
                        "h-9 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "[&_svg]:size-4 [&_svg]:shrink-0",
                        active
                          ? "[&_svg]:text-sidebar-primary-foreground"
                          : "[&_svg]:text-sidebar-foreground/50",
                      )}
                    >
                      <Link href={item.url}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={Boolean(itemActive)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={Boolean(itemActive)}
                        className={cn(
                          "h-9 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150",
                          itemActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "[&_svg:not(.chevron)]:size-4 [&_svg:not(.chevron)]:shrink-0",
                        )}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                        <ChevronRightIcon className="chevron ml-auto size-3.5 shrink-0 text-sidebar-foreground/35 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-4 mt-0.5 gap-0.5 border-l border-sidebar-border/50 pl-3">
                        {item.items?.map((subItem) => {
                          const subActive = isNavActive(pathname, subItem.url);
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subActive}
                                className={cn(
                                  "h-8 rounded-md text-[12px] transition-colors duration-150",
                                  subActive
                                    ? "font-medium text-sidebar-primary"
                                    : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
                                )}
                              >
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}

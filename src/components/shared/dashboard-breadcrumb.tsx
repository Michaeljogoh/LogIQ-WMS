"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  inventory: "Inventory",
  inbound: "Inbound",
  outbound: "Outbound",
  shipments: "Shipments",
  merchants: "Merchants",
  analytics: "Analytics",
  settings: "Settings",
  users: "Users",
  billing: "Billing",
  packaging: "Packaging",
  notifications: "Notifications",
  integrations: "Integrations",
  transfers: "Transfers",
  returns: "Returns",
  "cycle-counts": "Cycle counts",
  locations: "Locations",
  printers: "Printers",
  platform: "Platform",
  portal: "Portal",
  logiq: "LogIQ AI",
  ai: "AI",
  support: "Support",
  users_mgmt: "User access",
  warehouses: "Warehouses",
};

function formatSegment(seg: string): string {
  return (
    SEGMENT_LABELS[seg] ??
    seg.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function isId(segment: string): boolean {
  return /^[a-z0-9]{20,}$/i.test(segment) || /^[0-9a-f-]{36}$/i.test(segment);
}

export function DashboardBreadcrumb() {
  const pathname = usePathname();

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => !isId(s));

  if (segments.length === 0) {
    return null;
  }

  const last = segments[segments.length - 1];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.length === 1 ? (
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-foreground">
              {formatSegment(last ?? "")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            const href = "/" + segments.slice(0, i + 1).join("/");
            return (
              <span key={seg} className="flex items-center gap-1.5">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="font-medium text-foreground">
                      {formatSegment(seg)}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href={href}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {formatSegment(seg)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

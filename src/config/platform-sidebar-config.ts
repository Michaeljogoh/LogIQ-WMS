import type { LucideIcon } from "lucide-react";
import {
  Building2Icon,
  CreditCardIcon,
  ClipboardListIcon,
  HeadphonesIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  ShieldIcon,
} from "lucide-react";

export type PlatformNavItemConfig = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type PlatformNavSectionConfig = {
  label: string;
  items: PlatformNavItemConfig[];
};

export const platformNavSections: PlatformNavSectionConfig[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Dashboard",
        url: "/platform/dashboard",
        icon: LayoutDashboardIcon,
      },
      {
        title: "Accounts",
        url: "/platform/accounts",
        icon: Building2Icon,
      },
      {
        title: "Support",
        url: "/platform/support",
        icon: HeadphonesIcon,
      },
      {
        title: "Audit log",
        url: "/platform/audit",
        icon: ClipboardListIcon,
      },
      {
        title: "Billing",
        url: "/platform/billing",
        icon: CreditCardIcon,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Diagnostics",
        url: "/platform/diagnostics",
        icon: ShieldIcon,
      },
      {
        title: "Security",
        url: "/platform/security",
        icon: Settings2Icon,
      },
    ],
  },
];

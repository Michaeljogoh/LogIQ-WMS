import type { LucideIcon } from "lucide-react";
import {
  BarChart3Icon,
  BotIcon,
  Building2Icon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MessageSquareIcon,
  PackageIcon,
  PackageSearchIcon,
  PlugIcon,
  PrinterIcon,
  Settings2Icon,
  TagIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react";

export type MerchantPermission = "READ" | "WRITE" | "BILLING";

export type SidebarNavItemConfig = {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: { title: string; url: string }[];
  /** When set, item is shown for MERCHANT_USER only if user has every listed permission */
  merchantPermissions?: MerchantPermission[];
};

export type SidebarNavSectionConfig = {
  label: string;
  items: SidebarNavItemConfig[];
};

export type DashboardSidebarRoleKey =
  | "platform_admin"
  | "threepl_account_owner"
  | "warehouse_manager"
  | "warehouse_staff"
  | "merchant_owner"
  | "merchant_user";

const operatorOwnerSections: SidebarNavSectionConfig[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboardIcon,
      },
      { title: "LogIQ", url: "/logiq", icon: BotIcon },
      { title: "Analytics", url: "/analytics", icon: BarChart3Icon },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { title: "Orders", url: "/orders", icon: PackageSearchIcon },
      { title: "Printing", url: "/printing", icon: PrinterIcon },
      { title: "Transfers", url: "/transfers", icon: TruckIcon },
      {
        title: "Labels",
        url: "/labels/templates",
        icon: TagIcon,
        items: [
          { title: "Templates", url: "/labels/templates" },
          { title: "New template", url: "/labels/templates/new" },
        ],
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: "Inventory", url: "/inventory", icon: WarehouseIcon },
      { title: "Locations", url: "/inventory/locations", icon: MapPinIcon },
      { title: "Products", url: "/inventory/products", icon: PackageIcon },
      {
        title: "Cycle counts",
        url: "/inventory/cycle-counts",
        icon: ClipboardListIcon,
      },
    ],
  },
  {
    label: "Inbound",
    items: [
      {
        title: "Inbound",
        url: "/inbound",
        icon: InboxIcon,
        items: [
          { title: "Overview", url: "/inbound" },
          { title: "Suppliers", url: "/inbound/suppliers" },
          { title: "Purchase orders", url: "/inbound/purchase-orders" },
          {
            title: "New purchase order",
            url: "/inbound/purchase-orders/new",
          },
          { title: "New work order", url: "/inbound/work-orders/new" },
        ],
      },
    ],
  },
  {
    label: "Merchants",
    items: [{ title: "Merchants", url: "/merchants", icon: Building2Icon }],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Settings",
        url: "/settings/warehouses",
        icon: Settings2Icon,
        items: [
          { title: "Warehouses", url: "/settings/warehouses" },
          { title: "Routing", url: "/settings/routing" },
          { title: "Packaging", url: "/settings/packaging" },
          { title: "Printers", url: "/settings/printers" },
          { title: "Notifications", url: "/settings/notifications" },
          { title: "Users", url: "/settings/users" },
          { title: "Security", url: "/settings/security" },
          { title: "Billing overview", url: "/settings/billing" },
          { title: "Plan", url: "/settings/billing/plan" },
        ],
      },
    ],
  },
  {
    label: "Onboarding",
    items: [
      {
        title: "Setup checklist",
        url: "/onboarding",
        icon: FileTextIcon,
      },
    ],
  },
];

const warehouseManagerSections: SidebarNavSectionConfig[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboardIcon,
      },
      { title: "LogIQ", url: "/logiq", icon: BotIcon },
      { title: "Analytics", url: "/analytics", icon: BarChart3Icon },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { title: "Orders", url: "/orders", icon: PackageSearchIcon },
      { title: "Printing", url: "/printing", icon: PrinterIcon },
      { title: "Transfers", url: "/transfers", icon: TruckIcon },
      {
        title: "Labels",
        url: "/labels/templates",
        icon: TagIcon,
        items: [
          { title: "Templates", url: "/labels/templates" },
          { title: "New template", url: "/labels/templates/new" },
        ],
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: "Inventory", url: "/inventory", icon: WarehouseIcon },
      { title: "Locations", url: "/inventory/locations", icon: MapPinIcon },
      { title: "Products", url: "/inventory/products", icon: PackageIcon },
      {
        title: "Cycle counts",
        url: "/inventory/cycle-counts",
        icon: ClipboardListIcon,
      },
    ],
  },
  {
    label: "Inbound",
    items: [
      {
        title: "Inbound",
        url: "/inbound",
        icon: InboxIcon,
        items: [
          { title: "Overview", url: "/inbound" },
          { title: "Suppliers", url: "/inbound/suppliers" },
          { title: "Purchase orders", url: "/inbound/purchase-orders" },
          {
            title: "New purchase order",
            url: "/inbound/purchase-orders/new",
          },
          { title: "New work order", url: "/inbound/work-orders/new" },
        ],
      },
    ],
  },
  {
    label: "Merchants",
    items: [{ title: "Merchants", url: "/merchants", icon: Building2Icon }],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Settings",
        url: "/settings/warehouses",
        icon: Settings2Icon,
        items: [
          { title: "Warehouses", url: "/settings/warehouses" },
          { title: "Staff assignments", url: "/settings/staff" },
          { title: "Routing", url: "/settings/routing" },
          { title: "Packaging", url: "/settings/packaging" },
          { title: "Printers", url: "/settings/printers" },
          { title: "Notifications", url: "/settings/notifications" },
        ],
      },
    ],
  },
];

const warehouseStaffSections: SidebarNavSectionConfig[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { title: "Orders", url: "/orders", icon: PackageSearchIcon },
      { title: "Printing", url: "/printing", icon: PrinterIcon },
      { title: "Transfers", url: "/transfers", icon: TruckIcon },
      {
        title: "Labels",
        url: "/labels/templates",
        icon: TagIcon,
        items: [{ title: "Templates", url: "/labels/templates" }],
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: "Inventory", url: "/inventory", icon: WarehouseIcon },
      { title: "Locations", url: "/inventory/locations", icon: MapPinIcon },
      { title: "Products", url: "/inventory/products", icon: PackageIcon },
      {
        title: "Cycle counts",
        url: "/inventory/cycle-counts",
        icon: ClipboardListIcon,
      },
    ],
  },
  {
    label: "Inbound",
    items: [
      {
        title: "Inbound",
        url: "/inbound",
        icon: InboxIcon,
        items: [
          { title: "Overview", url: "/inbound" },
          { title: "Purchase orders", url: "/inbound/purchase-orders" },
        ],
      },
    ],
  },
];

const merchantPortalSections: SidebarNavSectionConfig[] = [
  {
    label: "Portal",
    items: [
      {
        title: "Dashboard",
        url: "/portal/dashboard",
        icon: LayoutDashboardIcon,
        merchantPermissions: ["READ"],
      },
      {
        title: "LogIQ chat",
        url: "/portal/chat",
        icon: MessageSquareIcon,
        merchantPermissions: ["READ"],
      },
      {
        title: "Billing",
        url: "/portal/billing",
        icon: CreditCardIcon,
        merchantPermissions: ["BILLING"],
      },
      {
        title: "Team",
        url: "/portal/team",
        icon: UsersIcon,
        merchantPermissions: ["WRITE"],
      },
      {
        title: "Settings",
        url: "/portal/settings",
        icon: Settings2Icon,
        merchantPermissions: ["READ"],
        items: [
          { title: "General", url: "/portal/settings" },
          { title: "Security", url: "/portal/settings/security" },
        ],
      },
      {
        title: "Integrations",
        url: "/portal/settings/integrations",
        icon: PlugIcon,
        merchantPermissions: ["WRITE"],
      },
    ],
  },
];

/** Role-keyed nav (Repeatra-style). Same sidebar component reads `sidebarConfig[roleKey]`. */
export const sidebarConfig: Record<
  DashboardSidebarRoleKey,
  SidebarNavSectionConfig[]
> = {
  platform_admin: operatorOwnerSections,
  threepl_account_owner: operatorOwnerSections,
  warehouse_manager: warehouseManagerSections,
  warehouse_staff: warehouseStaffSections,
  merchant_owner: merchantPortalSections,
  merchant_user: merchantPortalSections,
};

export function systemRoleToSidebarKey(
  systemRole: string | null | undefined,
): DashboardSidebarRoleKey | null {
  switch (systemRole) {
    case "PLATFORM_ADMIN":
      return "platform_admin";
    case "THREEPL_ACCOUNT_OWNER":
      return "threepl_account_owner";
    case "WAREHOUSE_MANAGER":
      return "warehouse_manager";
    case "WAREHOUSE_STAFF":
      return "warehouse_staff";
    case "MERCHANT_OWNER":
      return "merchant_owner";
    case "MERCHANT_USER":
      return "merchant_user";
    default:
      return null;
  }
}

function merchantUserCanSeeItem(
  item: SidebarNavItemConfig,
  permissions: MerchantPermission[],
): boolean {
  if (!item.merchantPermissions?.length) {
    return true;
  }
  return item.merchantPermissions.every((p) => permissions.includes(p));
}

export type SidebarNavContext = "operator" | "portal";

export function resolveSidebarRoleKey(
  systemRole: string | null | undefined,
  context: SidebarNavContext,
  options?: { merchantId?: string | null },
): DashboardSidebarRoleKey | null {
  if (context === "portal") {
    if (systemRole === "MERCHANT_USER") {
      return "merchant_user";
    }
    if (
      systemRole === "MERCHANT_OWNER" ||
      systemRole === "PLATFORM_ADMIN" ||
      systemRole === "THREEPL_ACCOUNT_OWNER" ||
      Boolean(options?.merchantId)
    ) {
      return "merchant_owner";
    }
    return null;
  }

  if (systemRole === "MERCHANT_OWNER" || systemRole === "MERCHANT_USER") {
    return null;
  }

  return systemRoleToSidebarKey(systemRole) ?? "threepl_account_owner";
}

export function getSidebarSectionsForRole(
  systemRole: string | null | undefined,
  merchantPermissions: MerchantPermission[] = [],
  context: SidebarNavContext = "operator",
  options?: { merchantId?: string | null },
): SidebarNavSectionConfig[] {
  const roleKey = resolveSidebarRoleKey(systemRole, context, options);
  if (!roleKey) {
    return [];
  }

  const sections = sidebarConfig[roleKey] ?? [];

  if (roleKey !== "merchant_user") {
    return sections;
  }

  const effectivePermissions =
    merchantPermissions.length > 0
      ? merchantPermissions
      : (["READ"] as MerchantPermission[]);

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        merchantUserCanSeeItem(item, effectivePermissions),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

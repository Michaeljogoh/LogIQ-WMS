import {
  BarChart3Icon,
  BotIcon,
  Building2Icon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  InboxIcon,
  MapPinIcon,
  PackageSearchIcon,
  PrinterIcon,
  RouteIcon,
  Settings2Icon,
  TagIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react";
import type { DashboardFeatureLink } from "@/components/dashboard/dashboard-feature-grid";

type OperatorLinkContext = {
  canManageBilling: boolean;
  canManageTeam: boolean;
  canManageLabelTemplates: boolean;
  canManageEscalationRules: boolean;
  isAccountOwner: boolean;
};

const ALL_OPERATOR_FEATURES: Array<
  DashboardFeatureLink & { show?: (ctx: OperatorLinkContext) => boolean }
> = [
  {
    title: "Orders",
    href: "/orders",
    description: "Fulfillment queue, picking, packing, and shipping",
    icon: PackageSearchIcon,
  },
  {
    title: "Inbound",
    href: "/inbound",
    description: "Purchase orders, receiving, and suppliers",
    icon: InboxIcon,
  },
  {
    title: "Inventory",
    href: "/inventory",
    description: "Products, stock levels, and movements",
    icon: ClipboardListIcon,
  },
  {
    title: "Locations",
    href: "/inventory/locations",
    description: "Zones, bins, and warehouse map",
    icon: MapPinIcon,
  },
  {
    title: "Cycle counts",
    href: "/inventory/cycle-counts",
    description: "Reconcile on-hand quantities",
    icon: ClipboardListIcon,
  },
  {
    title: "Transfers",
    href: "/transfers",
    description: "Move stock between warehouses",
    icon: TruckIcon,
  },
  {
    title: "Merchants",
    href: "/merchants",
    description: "Client brands, contracts, and billing",
    icon: Building2Icon,
  },
  {
    title: "Analytics",
    href: "/analytics",
    description: "Throughput, inventory health, and exports",
    icon: BarChart3Icon,
    badge: "Reports",
  },
  {
    title: "LogIQ AI",
    href: "/logiq",
    description: "Natural-language queries and capacity forecasts",
    icon: BotIcon,
    badge: "AI",
  },
  {
    title: "Labels",
    href: "/labels/templates",
    description: "Design and print product, bin, and pallet labels",
    icon: TagIcon,
    show: (ctx) => ctx.canManageLabelTemplates || ctx.isAccountOwner,
  },
  {
    title: "Printing",
    href: "/printing",
    description: "Print queue and document jobs",
    icon: PrinterIcon,
  },
  {
    title: "Packaging",
    href: "/settings/packaging",
    description: "Cartons, mailers, and fulfillment materials",
    icon: Settings2Icon,
    show: (ctx) => ctx.isAccountOwner,
  },
  {
    title: "Printers",
    href: "/settings/printers",
    description: "Label printers and print stations",
    icon: PrinterIcon,
    show: (ctx) => ctx.isAccountOwner,
  },
  {
    title: "Routing rules",
    href: "/settings/routing",
    description: "Order routing and warehouse selection",
    icon: RouteIcon,
    show: (ctx) => ctx.isAccountOwner,
  },
  {
    title: "Billing",
    href: "/settings/billing",
    description: "Plans, invoices, and fee configuration",
    icon: CreditCardIcon,
    show: (ctx) => ctx.canManageBilling,
  },
  {
    title: "Team",
    href: "/settings/users",
    description: "Invite operators and assign warehouse access",
    icon: UsersIcon,
    show: (ctx) => ctx.canManageTeam,
  },
  {
    title: "Warehouses",
    href: "/settings/warehouses",
    description: "Sites, zones, and operational settings",
    icon: WarehouseIcon,
  },
  {
    title: "Notifications",
    href: "/settings/notifications",
    description: "Alerts and escalation rules",
    icon: FileTextIcon,
    show: (ctx) => ctx.canManageEscalationRules || ctx.isAccountOwner,
  },
];

export function getOperatorDashboardLinks(
  ctx: OperatorLinkContext,
): DashboardFeatureLink[] {
  return ALL_OPERATOR_FEATURES.filter(
    (link) => link.show === undefined || link.show(ctx),
  ).map(({ show: _show, ...link }) => link);
}

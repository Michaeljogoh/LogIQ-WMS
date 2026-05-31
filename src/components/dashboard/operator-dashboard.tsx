"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  Building2Icon,
  CheckCircle2Icon,
  CircleIcon,
  PackageSearchIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { useOperatorRole } from "@/hooks/use-operator-role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const QUICK_LINKS = [
  { title: "Orders", href: "/orders", description: "Fulfillment queue" },
  { title: "Inventory", href: "/inventory", description: "Stock & movements" },
  { title: "Inbound", href: "/inbound", description: "POs & receiving" },
  { title: "Merchants", href: "/merchants", description: "Client accounts" },
  { title: "Analytics", href: "/analytics", description: "Ops reporting" },
  { title: "LogIQ", href: "/logiq", description: "AI assistant" },
] as const;

function SetupStep(
  props: Readonly<{
    done: boolean;
    title: string;
    description: string;
    href: string;
    actionLabel: string;
  }>,
) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 p-4">
      {props.done ? (
        <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
      ) : (
        <CircleIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{props.title}</p>
        <p className="text-xs text-muted-foreground">{props.description}</p>
        {!props.done ? (
          <Button asChild className="mt-2 h-8" size="sm" variant="outline">
            <Link href={props.href}>{props.actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function OperatorDashboard() {
  const trpc = useTRPC();
  const {
    isAccountOwner,
    canManageTeam,
    canCreateWarehouse,
    canCreateMerchant,
    canAccessOnboarding,
    canManageBilling,
    canAssignWarehouseStaff,
  } = useOperatorRole();

  const operationsQuery = useQuery(
    trpc.analytics.operationsDashboard.queryOptions(),
  );
  const inventoryQuery = useQuery(
    trpc.analytics.inventoryHealth.queryOptions(),
  );
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());
  const teamQuery = useQuery({
    ...trpc.accountUser.list.queryOptions(),
    enabled: canManageTeam,
  });
  const merchantsQuery = useQuery(trpc.merchant.list.queryOptions());

  const warehouseCount = warehousesQuery.data?.length ?? 0;
  const teamCount =
    teamQuery.data?.filter((u) => u.systemRole !== "THREEPL_ACCOUNT_OWNER")
      .length ?? 0;
  const merchantCount = merchantsQuery.data?.length ?? 0;

  const ops = operationsQuery.data;
  const inventory = inventoryQuery.data;

  const setupComplete =
    warehouseCount > 0 &&
    (!canManageTeam || teamCount > 0) &&
    (!canCreateMerchant || merchantCount > 0);

  return (
    <div className="space-y-8 p-6">
      <OperatorPageHeader
        description={
          isAccountOwner
            ? "Operations overview for your 3PL workspace."
            : "Operations overview for your assigned warehouses."
        }
        title="Dashboard"
        actions={
          canAccessOnboarding ? (
            <Button asChild variant="outline">
              <Link href="/onboarding">Setup wizard</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders today</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {operationsQuery.isLoading ? "—" : (ops?.ordersToday ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {ops?.pendingOrders ?? 0} pending fulfillment
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fulfillment rate (today)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {operationsQuery.isLoading
                ? "—"
                : `${ops?.fulfillmentRatePct ?? 0}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            SLA (7d): {ops?.slaCompliancePct7d ?? 100}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg pick time (7d)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {operationsQuery.isLoading
                ? "—"
                : `${ops?.avgPickTimeMins ?? 0}m`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Based on completed pick lists
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inventory health</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {inventoryQuery.isLoading ? "—" : (inventory?.lowStockCount ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Low-stock SKUs · {inventory?.deadStockCount ?? 0} dead stock
          </CardContent>
        </Card>
      </div>

      <div
        className={
          isAccountOwner ? "grid gap-6 lg:grid-cols-2" : "grid gap-6"
        }
      >
        {isAccountOwner ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace setup</CardTitle>
              <CardDescription>
                Complete these steps to run end-to-end flows as a 3PL account
                owner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {setupComplete ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  Core setup complete — explore modules below.
                </div>
              ) : null}
              {canCreateWarehouse ? (
                <SetupStep
                  actionLabel="Add warehouse"
                  description="At least one site for inventory and fulfillment."
                  done={warehouseCount > 0}
                  href="/settings/warehouses"
                  title={`Warehouses (${warehouseCount})`}
                />
              ) : null}
              {canManageTeam ? (
                <SetupStep
                  actionLabel="Invite team"
                  description="Warehouse managers and staff with role assignments."
                  done={teamCount > 0}
                  href="/settings/users"
                  title={`Team members (${teamCount})`}
                />
              ) : null}
              {canCreateMerchant ? (
                <SetupStep
                  actionLabel="Add merchant"
                  description="Client brand with owner invite to the merchant portal."
                  done={merchantCount > 0}
                  href="/merchants"
                  title={`Merchants (${merchantCount})`}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick links</CardTitle>
            <CardDescription>Jump to main operator modules.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {QUICK_LINKS.map((link) => (
              <Link
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                href={link.href}
                key={link.href}
              >
                <span>
                  <span className="font-medium">{link.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {link.description}
                  </span>
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAccountOwner ? "Settings & admin" : "Shortcuts"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/warehouses">
              <WarehouseIcon className="mr-1.5 size-4" />
              Warehouses
            </Link>
          </Button>
          {canManageTeam ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/users">
                <UsersIcon className="mr-1.5 size-4" />
                Users
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href="/merchants">
              <Building2Icon className="mr-1.5 size-4" />
              Merchants
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/orders">
              <PackageSearchIcon className="mr-1.5 size-4" />
              Orders
            </Link>
          </Button>
          {canManageBilling ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/billing">Billing</Link>
            </Button>
          ) : null}
          {canAssignWarehouseStaff && !canManageTeam ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/staff">
                <UsersIcon className="mr-1.5 size-4" />
                Staff assignments
              </Link>
            </Button>
          ) : null}
          {isAccountOwner && warehouseCount === 0 ? (
            <Badge variant="secondary">Add a warehouse to unlock flows</Badge>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

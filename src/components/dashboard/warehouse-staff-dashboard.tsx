"use client";

import {
  ArrowRightIcon,
  ClipboardListIcon,
  InboxIcon,
  PackageSearchIcon,
} from "lucide-react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { parseWarehouseAssignments } from "@/lib/warehouse-assignments";
import {
  collectWarehousePermissions,
  hasSystemCapability,
} from "@/lib/system-permissions";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WarehouseStaffDashboard() {
  const session = authClient.useSession();
  const user = session.data?.user as SessionUser | undefined;
  const assignments = parseWarehouseAssignments(user?.warehouseAssignments);
  const warehousePermissions = collectWarehousePermissions(
    assignments.map((a) => ({ permissions: a.permissions })),
  );

  const ctx = { warehousePermissions };
  const canPick = hasSystemCapability("WAREHOUSE_STAFF", "pick_operations", ctx);
  const canPack = hasSystemCapability("WAREHOUSE_STAFF", "pack_operations", ctx);
  const canReceive = hasSystemCapability(
    "WAREHOUSE_STAFF",
    "receive_operations",
    ctx,
  );

  const links = [
    canPick || canPack
      ? {
          title: "Orders",
          href: "/orders",
          description: "Pick and fulfill outbound orders",
          icon: PackageSearchIcon,
        }
      : null,
    canReceive
      ? {
          title: "Inbound",
          href: "/inbound/purchase-orders",
          description: "Receive purchase orders and ASN",
          icon: InboxIcon,
        }
      : null,
    {
      title: "Inventory",
      href: "/inventory",
      description: "View stock and locations",
      icon: ClipboardListIcon,
    },
  ].filter(Boolean) as {
    title: string;
    href: string;
    description: string;
    icon: typeof PackageSearchIcon;
  }[];

  return (
    <div className="space-y-8 p-6">
      <OperatorPageHeader
        description="Your assigned warehouse tasks for today."
        title="Dashboard"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your permissions</CardTitle>
          <CardDescription>
            {warehousePermissions.length > 0
              ? warehousePermissions.join(", ")
              : "No permissions assigned yet — ask your warehouse manager."}
          </CardDescription>
        </CardHeader>
        {assignments.length > 0 ? (
          <CardContent className="text-sm text-muted-foreground">
            Assigned warehouses:{" "}
            {assignments.map((a) => a.warehouseId).join(", ")}
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Card key={link.href}>
            <CardHeader className="pb-2">
              <link.icon className="mb-2 size-5 text-muted-foreground" />
              <CardTitle className="text-base">{link.title}</CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href={link.href}>
                  Open
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

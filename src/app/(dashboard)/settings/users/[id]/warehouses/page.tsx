"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { useTRPC } from "@/app/trpc/client";
import { WarehouseStaffAssignmentForm } from "@/components/settings/warehouse-staff-assignment-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

export default function Page(props: PageProps) {
  const { id: accountUserId } = use(props.params);
  const trpc = useTRPC();

  const staffTarget = useQuery({
    ...trpc.accountUser.list.queryOptions(),
    select: (rows) => rows.find((r) => r.id === accountUserId),
  });

  const isStaff = staffTarget.data?.systemRole === "WAREHOUSE_STAFF";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Warehouse access
          </h1>
          <p className="text-sm text-muted-foreground">
            {staffTarget.data?.email ?? "User"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings/users">Back</Link>
        </Button>
      </div>

      {!isStaff ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No floor assignment</CardTitle>
            <CardDescription>
              Warehouse pick, pack, and receive scopes apply to users with the
              warehouse staff role.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <WarehouseStaffAssignmentForm
          accountUserId={accountUserId}
          permissionMode="full"
          staffEmail={staffTarget.data?.email ?? "Staff member"}
        />
      )}
    </div>
  );
}

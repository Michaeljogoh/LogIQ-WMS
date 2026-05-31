"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { useTRPC } from "@/app/trpc/client";
import { WarehouseStaffAssignmentForm } from "@/components/settings/warehouse-staff-assignment-form";
import { Button } from "@/components/ui/button";
import { useOperatorRole } from "@/hooks/use-operator-role";

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

export default function WarehouseStaffAssignPage(props: PageProps) {
  const { id: accountUserId } = use(props.params);
  const trpc = useTRPC();
  const { isAccountOwner } = useOperatorRole();

  const teamQuery = useQuery(trpc.warehouseStaff.listTeam.queryOptions());
  const member = teamQuery.data?.find((m) => m.id === accountUserId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Assign permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            {member?.email ?? "Warehouse staff"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings/staff">Back to staff</Link>
        </Button>
      </div>

      {teamQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {!teamQuery.isLoading && !member ? (
        <p className="text-sm text-destructive">Staff member not found.</p>
      ) : null}

      {member ? (
        <WarehouseStaffAssignmentForm
          accountUserId={accountUserId}
          permissionMode={isAccountOwner ? "full" : "pickReceive"}
          staffEmail={member.email}
        />
      ) : null}
    </div>
  );
}

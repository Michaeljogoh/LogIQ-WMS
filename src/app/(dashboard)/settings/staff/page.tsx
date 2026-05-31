"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { OperatorPageHeader } from "@/components/dashboard/operator-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WarehouseStaffPage() {
  const trpc = useTRPC();
  const teamQuery = useQuery(trpc.warehouseStaff.listTeam.queryOptions());

  return (
    <div className="space-y-6 p-6">
      <OperatorPageHeader
        description="Assign pick and receive permissions for warehouse staff at your sites. New team members are added by your account owner."
        title="Warehouse staff"
      />

      {teamQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading staff…</p>
      ) : null}

      {teamQuery.isError ? (
        <p className="text-sm text-destructive">{teamQuery.error.message}</p>
      ) : null}

      {!teamQuery.isLoading && (teamQuery.data?.length ?? 0) === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No warehouse staff yet</CardTitle>
            <CardDescription>
              When your account owner invites warehouse staff, they will appear
              here so you can assign pick and receive duties.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="space-y-3">
        {teamQuery.data?.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{member.displayName}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
                {member.assignments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {member.assignments.map((a) => (
                      <Badge key={a.id} variant="secondary">
                        {a.warehouseName}: {a.permissions.join(", ")}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">
                    No assignments at your warehouses yet.
                  </p>
                )}
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/settings/staff/${member.id}`}>
                  Assign pick / receive
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

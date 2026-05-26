"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
import { InviteTeamMemberForm } from "@/components/settings/invite-team-member-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  const trpc = useTRPC();
  const usersQuery = useQuery(trpc.accountUser.list.queryOptions());

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Invite warehouse managers and staff. Each invite includes a temporary
            password and warehouse assignments.
          </p>
        </div>
        <InviteTeamMemberForm onSuccess={() => void usersQuery.refetch()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>
            Managers and staff sign in at the operator dashboard with the email and
            password from their invitation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {usersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {usersQuery.data?.map((u) => (
            <div
              className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 py-3 last:border-0"
              key={u.id}
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                </p>
                {u.warehouses.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Warehouses: {u.warehouses.map((w) => w.name).join(", ")}
                    {u.permissions.length > 0
                      ? ` · ${u.permissions.join(", ")}`
                      : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{u.roleLabel}</Badge>
                {u.systemRole === "WAREHOUSE_STAFF" ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/settings/users/${u.id}/warehouses`}>
                      Edit access
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

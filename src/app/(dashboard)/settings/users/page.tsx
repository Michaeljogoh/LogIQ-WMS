"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/app/trpc/client";
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
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Operator and warehouse roles synced from your organisation membership.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Team members</CardTitle>
            <CardDescription>
              Invite colleagues through organisation settings in better-auth, or
              manage warehouse access per user.
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/onboarding">Onboarding</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {usersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {usersQuery.data?.map((u) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-3 last:border-0"
              key={u.id}
            >
              <div>
                <p className="text-sm font-medium">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{u.systemRole}</Badge>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/settings/users/${u.id}/warehouses`}>
                    Warehouses
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

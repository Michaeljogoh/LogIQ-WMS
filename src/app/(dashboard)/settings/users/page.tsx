"use client";

import { useQuery } from "@tanstack/react-query";
import { Shield, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import { InviteTeamMemberForm } from "@/components/settings/invite-team-member-form";
import {
  SettingsListItem,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Page() {
  const trpc = useTRPC();
  const usersQuery = useQuery(trpc.accountUser.list.queryOptions());
  const users = usersQuery.data ?? [];
  const isLoading = usersQuery.isLoading;

  const stats = useMemo(() => {
    const managers = users.filter(
      (u) => u.systemRole === "WAREHOUSE_MANAGER",
    ).length;
    const staff = users.filter(
      (u) => u.systemRole === "WAREHOUSE_STAFF",
    ).length;
    const withAccess = users.filter((u) => u.warehouses.length > 0).length;
    return { managers, staff, withAccess };
  }, [users]);

  return (
    <SettingsPage>
      <PageHeader
        actions={
          <InviteTeamMemberForm onSuccess={() => void usersQuery.refetch()} />
        }
        description="Invite warehouse managers and staff. Each invite includes a temporary password and warehouse assignments."
        title="Users"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint="Managers and staff on this account"
          icon={Users}
          isLoading={isLoading}
          label="Team members"
          value={users.length}
        />
        <KpiStatCard
          accent="navy-violet"
          hint={`${stats.staff} warehouse staff`}
          icon={UserCog}
          isLoading={isLoading}
          label="Managers"
          value={stats.managers}
        />
        <KpiStatCard
          accent="success"
          hint="Users with warehouse assignments"
          icon={Shield}
          isLoading={isLoading}
          label="With access"
          value={stats.withAccess}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Managers and staff sign in at the operator dashboard with the email and password from their invitation."
          icon={Users}
          title="Team members"
        />
        <SettingsPanelBody className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}

          {users.map((u) => (
            <SettingsListItem
              actions={
                <>
                  <Badge variant="secondary">{u.roleLabel}</Badge>
                  {u.systemRole === "WAREHOUSE_STAFF" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/settings/users/${u.id}/warehouses`}>
                        Edit access
                      </Link>
                    </Button>
                  ) : null}
                </>
              }
              key={u.id}
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{u.email}</p>
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
            </SettingsListItem>
          ))}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

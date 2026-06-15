"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, Info, MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsTableWrap,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { SlackConnectButton } from "@/components/shared/slack-connect-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOperatorRole } from "@/hooks/use-operator-role";
import { cn } from "@/lib/utils";

const severities = ["INFO", "WARNING", "CRITICAL"] as const;

const SEVERITY_META = {
  CRITICAL: { badge: "destructive" as const, className: "settings-escalation-section--critical" },
  WARNING: { badge: "warning" as const, className: "settings-escalation-section--warning" },
  INFO: { badge: "info" as const, className: "settings-escalation-section--info" },
};

export default function Page() {
  const trpc = useTRPC();
  const { canManageEscalationRules } = useOperatorRole();
  const queryClient = useQueryClient();
  const preferencesQuery = useQuery(
    trpc.notifications.getPreferences.queryOptions(),
  );
  const escalationQuery = useQuery({
    ...trpc.escalation.getRules.queryOptions(),
    enabled: canManageEscalationRules,
  });
  const updatePreference = useMutation(
    trpc.notifications.updatePreference.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.notifications.getPreferences.queryFilter(),
        );
      },
    }),
  );
  const upsertRule = useMutation(
    trpc.escalation.upsertRule.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.escalation.getRules.queryFilter(),
        );
      },
    }),
  );

  const preferences = preferencesQuery.data ?? [];

  const rulesBySeverity = useMemo(
    () =>
      new Map(
        (escalationQuery.data ?? []).map((rule) => [rule.severity, rule]),
      ),
    [escalationQuery.data],
  );

  const channelCount = useMemo(() => {
    let count = 0;
    for (const row of preferences) {
      if (row.inApp) count++;
      if (row.email) count++;
      if (row.slack) count++;
      if (row.sms) count++;
      if (row.push) count++;
    }
    return count;
  }, [preferences]);

  return (
    <SettingsPage>
      <PageHeader
        description="Configure how and when you receive alerts across in-app, email, Slack, SMS, and push."
        title="Notifications"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint="Alert categories you can configure"
          icon={Bell}
          isLoading={preferencesQuery.isLoading}
          label="Notification types"
          value={preferences.length}
        />
        <KpiStatCard
          accent="navy-teal"
          hint="Enabled delivery channels"
          icon={MessageSquare}
          isLoading={preferencesQuery.isLoading}
          label="Channels active"
          value={channelCount}
        />
        <KpiStatCard
          accent="navy-violet"
          hint={canManageEscalationRules ? "Severity-based escalation" : "Owner access required"}
          icon={AlertTriangle}
          isLoading={escalationQuery.isLoading}
          label="Escalation rules"
          value={canManageEscalationRules ? severities.length : "—"}
        />
      </div>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Toggle delivery channels for each notification type."
          icon={Bell}
          title="Notification preferences"
        />
        <SettingsPanelBody>
          <SettingsTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>In App</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Slack</TableHead>
                  <TableHead>SMS</TableHead>
                  <TableHead>Push</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preferences.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.type}</TableCell>
                    {(
                      [
                        ["inApp", row.inApp],
                        ["email", row.email],
                        ["slack", row.slack],
                        ["sms", row.sms],
                        ["push", row.push],
                      ] as const
                    ).map(([field, checked]) => (
                      <TableCell key={field}>
                        <Switch
                          checked={checked}
                          onCheckedChange={(value) =>
                            updatePreference.mutate({
                              type: row.type,
                              [field]: value,
                            })
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SettingsTableWrap>
        </SettingsPanelBody>
      </SettingsPanel>

      {canManageEscalationRules ? (
        <SettingsPanel>
          <SettingsPanelHeader
            description="Define ack windows and escalation paths for unacknowledged alerts."
            icon={AlertTriangle}
            title="Escalation rules"
          />
          <SettingsPanelBody className="space-y-4">
            {severities.map((severity) => {
              const current = rulesBySeverity.get(severity);
              const meta = SEVERITY_META[severity];
              return (
                <div
                  className={cn("settings-escalation-section", meta.className)}
                  key={severity}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant={meta.badge}>{severity}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Ack window (mins)
                      </p>
                      <Input
                        defaultValue={current?.ackWindowMinutes ?? 120}
                        min={1}
                        onBlur={(event) =>
                          upsertRule.mutate({
                            severity,
                            ackWindowMinutes: Math.max(
                              1,
                              Number(event.target.value) || 120,
                            ),
                            escalateTo: current?.escalateTo ?? [],
                            escalateViaSms: current?.escalateViaSms ?? true,
                          })
                        }
                        type="number"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Escalate to (AccountUser IDs comma-separated)
                      </p>
                      <Input
                        defaultValue={(current?.escalateTo ?? []).join(",")}
                        onBlur={(event) =>
                          upsertRule.mutate({
                            severity,
                            ackWindowMinutes: current?.ackWindowMinutes ?? 120,
                            escalateTo: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                            escalateViaSms: current?.escalateViaSms ?? true,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Escalate via SMS
                      </p>
                      <Switch
                        checked={current?.escalateViaSms ?? true}
                        onCheckedChange={(value) =>
                          upsertRule.mutate({
                            severity,
                            ackWindowMinutes: current?.ackWindowMinutes ?? 120,
                            escalateTo: current?.escalateTo ?? [],
                            escalateViaSms: value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </SettingsPanelBody>
        </SettingsPanel>
      ) : null}

      <SettingsPanel>
        <SettingsPanelHeader
          description="Connect a Slack workspace to receive alerts in a channel."
          icon={Info}
          title="Slack channel"
        />
        <SettingsPanelBody>
          <SlackConnectButton />
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

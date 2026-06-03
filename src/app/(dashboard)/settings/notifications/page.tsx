"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTRPC } from "@/app/trpc/client";
import { SlackConnectButton } from "@/components/shared/slack-connect-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useOperatorRole } from "@/hooks/use-operator-role";

const severities = ["INFO", "WARNING", "CRITICAL"] as const;

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

  const rulesBySeverity = useMemo(
    () =>
      new Map(
        (escalationQuery.data ?? []).map((rule) => [rule.severity, rule]),
      ),
    [escalationQuery.data],
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">In App</th>
                <th className="px-2 py-2 text-left">Email</th>
                <th className="px-2 py-2 text-left">Slack</th>
                <th className="px-2 py-2 text-left">SMS</th>
                <th className="px-2 py-2 text-left">Push</th>
              </tr>
            </thead>
            <tbody>
              {(preferencesQuery.data ?? []).map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="px-2 py-2">{row.type}</td>
                  {(
                    [
                      ["inApp", row.inApp],
                      ["email", row.email],
                      ["slack", row.slack],
                      ["sms", row.sms],
                      ["push", row.push],
                    ] as const
                  ).map(([field, checked]) => (
                    <td key={field} className="px-2 py-2">
                      <Switch
                        checked={checked}
                        onCheckedChange={(value) =>
                          updatePreference.mutate({
                            type: row.type,
                            [field]: value,
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {canManageEscalationRules ? (
        <Card>
          <CardHeader>
            <CardTitle>Escalation rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {severities.map((severity) => {
              const current = rulesBySeverity.get(severity);
              return (
                <div key={severity} className="rounded-md border p-3">
                  <p className="text-sm font-semibold">{severity}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Ack window (mins)
                      </p>
                      <Input
                        type="number"
                        min={1}
                        defaultValue={current?.ackWindowMinutes ?? 120}
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
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Slack channel</CardTitle>
        </CardHeader>
        <CardContent>
          <SlackConnectButton />
        </CardContent>
      </Card>
    </div>
  );
}

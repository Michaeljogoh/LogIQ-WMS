"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, Shield, UserPlus, Users } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/app/trpc/client";
import { KpiStatCard } from "@/components/charts/kpi-stat-card";
import {
  SettingsListItem,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const inviteSchema = z.object({
  email: z.string().email(),
  read: z.boolean(),
  write: z.boolean(),
  billing: z.boolean(),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function Page() {
  const trpc = useTRPC();
  const session = authClient.useSession();
  const sessionUser = session.data?.user as
    | { merchantId?: string; systemRole?: string }
    | undefined;
  const merchantId = sessionUser?.merchantId;
  const isOwner =
    sessionUser?.systemRole === "MERCHANT_OWNER" ||
    sessionUser?.systemRole === "PLATFORM_ADMIN";

  const teamQuery = useQuery({
    ...trpc.merchantUser.listForMerchant.queryOptions(
      { merchantId: merchantId ?? "" },
      { enabled: Boolean(merchantId) },
    ),
  });

  const inviteMutation = useMutation(
    trpc.merchantUser.invite.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation sent with sign-in instructions");
        void teamQuery.refetch();
        form.reset({ email: "", read: true, write: false, billing: false });
      },
      onError: (e) => toast.error(e.message ?? "Invite failed"),
    }),
  );

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      read: true,
      write: false,
      billing: false,
    },
  });

  const members = teamQuery.data ?? [];
  const stats = useMemo(() => {
    const pending = members.filter((m) => !m.betterAuthUserId).length;
    const owners = members.filter((m) => m.systemRole === "MERCHANT_OWNER").length;
    return { pending, owners, total: members.length };
  }, [members]);

  if (!merchantId) {
    return (
      <SettingsPage>
        <EmptyState
          description="Sign in with your merchant invitation, then return here to manage your team."
          icon={Users}
          title="Merchant account required"
        />
      </SettingsPage>
    );
  }

  return (
    <SettingsPage>
      <PageHeader
        description="Invite merchant users and assign portal permissions for billing, orders, and integrations."
        title="Team"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiStatCard
          accent="navy-blue"
          hint="Owners and users on this merchant"
          icon={Users}
          isLoading={teamQuery.isLoading}
          label="Team members"
          value={stats.total}
        />
        <KpiStatCard
          accent="warning"
          hint="Awaiting first sign-in"
          icon={Mail}
          isLoading={teamQuery.isLoading}
          label="Pending invites"
          value={stats.pending}
        />
        <KpiStatCard
          accent="navy-violet"
          hint="Full portal administration"
          icon={Shield}
          isLoading={teamQuery.isLoading}
          label="Owners"
          value={stats.owners}
        />
      </div>

      {isOwner ? (
        <SettingsPanel>
          <SettingsPanelHeader
            description="Sends an email with a temporary password and sign-in link for the merchant portal."
            icon={UserPlus}
            title="Invite user"
          />
          <SettingsPanelBody>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => {
                const perms: ("READ" | "WRITE" | "BILLING")[] = [];
                if (values.read) perms.push("READ");
                if (values.write) perms.push("WRITE");
                if (values.billing) perms.push("BILLING");
                if (perms.length === 0) {
                  toast.error("Select at least one permission");
                  return;
                }
                inviteMutation.mutate({
                  merchantId,
                  email: values.email,
                  permissions: perms,
                });
              })}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch("read")}
                    id="perm-read"
                    onCheckedChange={(v) => form.setValue("read", Boolean(v))}
                  />
                  <Label className="font-normal" htmlFor="perm-read">
                    Read
                  </Label>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch("write")}
                    id="perm-write"
                    onCheckedChange={(v) => form.setValue("write", Boolean(v))}
                  />
                  <Label className="font-normal" htmlFor="perm-write">
                    Write
                  </Label>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch("billing")}
                    id="perm-billing"
                    onCheckedChange={(v) =>
                      form.setValue("billing", Boolean(v))
                    }
                  />
                  <Label className="font-normal" htmlFor="perm-billing">
                    Billing
                  </Label>
                </div>
              </div>
              <Button
                className="min-h-11"
                disabled={inviteMutation.isPending}
                type="submit"
              >
                {inviteMutation.isPending ? "Sending…" : "Send invite"}
              </Button>
            </form>
          </SettingsPanelBody>
        </SettingsPanel>
      ) : null}

      <SettingsPanel>
        <SettingsPanelHeader
          description="Active members and pending invitations for your brand."
          icon={Users}
          title="Members"
        />
        <SettingsPanelBody className="space-y-2">
          {teamQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            members.map((m) => (
              <SettingsListItem
                actions={
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{m.systemRole}</Badge>
                    {m.systemRole === "MERCHANT_USER"
                      ? m.permissions.map((p) => (
                          <Badge key={p} variant="outline">
                            {p}
                          </Badge>
                        ))
                      : null}
                  </div>
                }
                key={m.id}
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.betterAuthUserId ? "Active" : "Pending invite"}
                  </p>
                </div>
              </SettingsListItem>
            ))
          )}
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

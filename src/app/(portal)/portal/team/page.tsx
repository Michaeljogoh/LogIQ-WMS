"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
  const merchantId = (session.data?.user as { merchantId?: string } | undefined)
    ?.merchantId;

  const teamQuery = useQuery({
    ...trpc.merchantUser.listForMerchant.queryOptions(
      { merchantId: merchantId ?? "" },
      { enabled: Boolean(merchantId) },
    ),
  });

  const inviteMutation = useMutation(
    trpc.merchantUser.invite.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation sent");
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

  if (!merchantId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Complete invitation linking, then reload this page to manage your team.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Invite merchant users and assign portal permissions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite user</CardTitle>
          <CardDescription>
            Sends a magic link to join this merchant portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => {
              const perms: ("READ" | "WRITE" | "BILLING")[] = [];
              if (values.read) {
                perms.push("READ");
              }
              if (values.write) {
                perms.push("WRITE");
              }
              if (values.billing) {
                perms.push("BILLING");
              }
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
                  onCheckedChange={(v) => form.setValue("billing", Boolean(v))}
                />
                <Label className="font-normal" htmlFor="perm-billing">
                  Billing
                </Label>
              </div>
            </div>
            <Button disabled={inviteMutation.isPending} type="submit">
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamQuery.data?.map((m) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0"
              key={m.id}
            >
              <div>
                <p className="text-sm font-medium">{m.email}</p>
                <p className="text-xs text-muted-foreground">
                  {m.betterAuthUserId ? "Active" : "Pending invite"}
                </p>
              </div>
              <div className="flex gap-1">
                <Badge variant="secondary">{m.systemRole}</Badge>
                {m.systemRole === "MERCHANT_USER"
                  ? m.permissions.map((p) => (
                      <Badge key={p} variant="outline">
                        {p}
                      </Badge>
                    ))
                  : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

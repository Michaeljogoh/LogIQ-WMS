"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { TwoFactorOtpInput } from "@/components/auth/two-factor-otp-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ESCALATED_ACTION_LABELS,
  ESCALATED_SUPPORT_ACTIONS,
  type EscalatedSupportAction,
} from "@/lib/platform-support";
import { sendTwoFactorOtp, verifyTwoFactorOtp } from "@/lib/two-factor-enrollment";

export function PlatformSupportConsole() {
  const trpc = useTRPC();
  const router = useRouter();

  const statusQuery = useQuery(trpc.platformSupport.getStatus.queryOptions());
  const accountsQuery = useQuery(
    trpc.platformSupport.listAccountsForSupport.queryOptions(),
  );
  const [readOnlyAccountId, setReadOnlyAccountId] = useState("");
  const [readOnlyReason, setReadOnlyReason] = useState(
    "Routine support investigation",
  );
  const [emergencyAccountId, setEmergencyAccountId] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("");
  const [escalationAccountId, setEscalationAccountId] = useState("");
  const [escalationAction, setEscalationAction] =
    useState<EscalatedSupportAction>("RETRY_SYNC");
  const [escalationTargetId, setEscalationTargetId] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaPending, setMfaPending] = useState(false);
  const [pendingEmergencyRequestId, setPendingEmergencyRequestId] = useState<
    string | null
  >(null);

  const targetsQuery = useQuery({
    ...trpc.platformSupport.listEscalationTargets.queryOptions({
      accountId: escalationAccountId,
      action: escalationAction,
    }),
    enabled: Boolean(escalationAccountId),
  });

  const escalateMut = useMutation(
    trpc.platformSupport.executeEscalatedAction.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        setConfirmPhrase("");
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const requestEmergencyMut = useMutation(
    trpc.platformSupport.requestEmergencyAccess.mutationOptions({
      onSuccess: () => {
        toast.success(
          "Approval email sent to the tenant account owner(s). Check server logs in development.",
        );
        void statusQuery.refetch();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const approvedRequest = useMemo(
    () =>
      statusQuery.data?.accessRequests.find((r) => r.status === "APPROVED") ??
      null,
    [statusQuery.data?.accessRequests],
  );

  async function startReadOnlySession() {
    if (!readOnlyAccountId || readOnlyReason.trim().length < 5) {
      toast.error("Select an account and provide a reason.");
      return;
    }
    const res = await fetch("/api/platform/support-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start_read_only",
        accountId: readOnlyAccountId,
        reason: readOnlyReason.trim(),
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Could not start session");
      return;
    }
    toast.success("Read-only support session started");
    router.push("/dashboard");
    router.refresh();
  }

  async function endSession() {
    const res = await fetch("/api/platform/support-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    if (!res.ok) {
      toast.error("Could not end session");
      return;
    }
    toast.success("Support session ended");
    void statusQuery.refetch();
    router.push("/platform/support");
    router.refresh();
  }

  async function verifyMfaAndContinue() {
    setMfaPending(true);
    try {
      await verifyTwoFactorOtp(mfaCode, false);
      const res = await fetch("/api/platform/support-mfa", { method: "POST" });
      if (!res.ok) {
        throw new Error("MFA verification could not be recorded");
      }
      void statusQuery.refetch();
      setMfaOpen(false);
      setMfaCode("");
      if (pendingEmergencyRequestId) {
        await startEmergencySession(pendingEmergencyRequestId);
        setPendingEmergencyRequestId(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Verification failed",
      );
    } finally {
      setMfaPending(false);
    }
  }

  async function startEmergencySession(accessRequestId: string) {
    if (!statusQuery.data?.mfaVerifiedRecently) {
      setPendingEmergencyRequestId(accessRequestId);
      await sendTwoFactorOtp();
      setMfaOpen(true);
      toast.message("Enter your 2FA code to start emergency impersonation");
      return;
    }

    const res = await fetch("/api/platform/support-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start_emergency",
        accessRequestId,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Could not start emergency session");
      return;
    }
    toast.success("Emergency impersonation session started");
    router.push("/dashboard");
    router.refresh();
  }

  const active = statusQuery.data?.activeSession;

  return (
    <div className="space-y-6">
      {active ? (
        <Card className="border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Active support session — {active.level === "READ_ONLY" ? "Level 1 (read-only)" : "Level 3 (emergency)"}
            </CardTitle>
            <CardDescription>
              {active.accountName} · expires{" "}
              {new Date(active.expiresAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="outline">{active.level}</Badge>
            <Button onClick={() => void endSession()} size="sm" variant="outline">
              End session
            </Button>
            {active.level === "READ_ONLY" ? (
              <Button asChild size="sm">
                <a href="/dashboard">Open read-only workspace</a>
              </Button>
            ) : (
              <Button asChild size="sm" variant="destructive">
                <a href="/dashboard">Open emergency workspace</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="level1">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="level1">Level 1 — Read-only</TabsTrigger>
          <TabsTrigger value="level2">Level 2 — Escalated actions</TabsTrigger>
          <TabsTrigger value="level3">Level 3 — Emergency</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="level1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Read-only support (default)</CardTitle>
              <CardDescription>
                Browse dashboards, inventory, orders, configuration, and analytics
                without mutating tenant data. All write APIs are blocked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tenant account</Label>
                  <Select
                    onValueChange={setReadOnlyAccountId}
                    value={readOnlyAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accountsQuery.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Reason</Label>
                  <Textarea
                    onChange={(e) => setReadOnlyReason(e.target.value)}
                    rows={2}
                    value={readOnlyReason}
                  />
                </div>
              </div>
              <Button onClick={() => void startReadOnlySession()} type="button">
                Start read-only session
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="level2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Escalated support actions</CardTitle>
              <CardDescription>
                Run a single approved fix with mandatory reason and confirmation.
                Each action is audit-logged.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tenant account</Label>
                  <Select
                    onValueChange={(v) => {
                      setEscalationAccountId(v);
                      setEscalationTargetId("");
                    }}
                    value={escalationAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accountsQuery.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    onValueChange={(v) => {
                      setEscalationAction(v as EscalatedSupportAction);
                      setEscalationTargetId("");
                    }}
                    value={escalationAction}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESCALATED_SUPPORT_ACTIONS.map((action) => (
                        <SelectItem key={action} value={action}>
                          {ESCALATED_ACTION_LABELS[action]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Target</Label>
                  <Select
                    disabled={!escalationAccountId || targetsQuery.isLoading}
                    onValueChange={setEscalationTargetId}
                    value={escalationTargetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {(targetsQuery.data ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Reason (required)</Label>
                  <Textarea
                    onChange={(e) => setEscalationReason(e.target.value)}
                    placeholder="Customer requested label regeneration"
                    rows={2}
                    value={escalationReason}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Confirmation — type{" "}
                    <code className="text-xs">EXECUTE {escalationAction}</code>
                  </Label>
                  <Input
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    value={confirmPhrase}
                  />
                </div>
              </div>
              <Button
                disabled={
                  escalateMut.isPending ||
                  !escalationAccountId ||
                  !escalationTargetId ||
                  escalationReason.trim().length < 10
                }
                onClick={() =>
                  escalateMut.mutate({
                    accountId: escalationAccountId,
                    action: escalationAction,
                    targetId: escalationTargetId,
                    reason: escalationReason.trim(),
                    confirmPhrase,
                  })
                }
                type="button"
              >
                {escalateMut.isPending ? "Running…" : "Execute action"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="level3">
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Emergency impersonation
              </CardTitle>
              <CardDescription>
                Rare, temporary, fully audited operator access. Requires 2FA,
                tenant owner email approval, and a mandatory reason. Never use as
                default support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!statusQuery.data?.mfaEnabled ? (
                <p className="text-sm text-destructive">
                  Enable two-factor authentication on your platform admin account
                  before requesting emergency access.
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tenant account</Label>
                  <Select
                    onValueChange={setEmergencyAccountId}
                    value={emergencyAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accountsQuery.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Reason (required)</Label>
                  <Textarea
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    rows={3}
                    value={emergencyReason}
                  />
                </div>
              </div>
              <Button
                disabled={
                  requestEmergencyMut.isPending ||
                  !emergencyAccountId ||
                  emergencyReason.trim().length < 10 ||
                  !statusQuery.data?.mfaEnabled
                }
                onClick={() =>
                  requestEmergencyMut.mutate({
                    accountId: emergencyAccountId,
                    reason: emergencyReason.trim(),
                  })
                }
                type="button"
                variant="destructive"
              >
                Request owner approval
              </Button>

              {approvedRequest ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="text-sm font-medium">
                    Approved: {approvedRequest.accountName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Impersonation window expires{" "}
                    {approvedRequest.impersonationExpiresAt
                      ? new Date(
                          approvedRequest.impersonationExpiresAt,
                        ).toLocaleString()
                      : "soon"}
                  </p>
                  <Button
                    onClick={() => void startEmergencySession(approvedRequest.id)}
                    type="button"
                    variant="destructive"
                  >
                    Start emergency session (MFA required)
                  </Button>
                </div>
              ) : null}

              {statusQuery.data?.accessRequests.some(
                (r) => r.status === "PENDING",
              ) ? (
                <p className="text-sm text-muted-foreground">
                  Pending approval — the account owner was emailed.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Audit trail</CardTitle>
            <CardDescription>
              All platform support events are recorded with admin, tenant, reason,
              and IP.
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/platform/audit">View full audit log</Link>
          </Button>
        </CardHeader>
      </Card>

      <Sheet onOpenChange={setMfaOpen} open={mfaOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Verify two-factor authentication</SheetTitle>
            <SheetDescription>
              Emergency impersonation requires a fresh 2FA verification.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <TwoFactorOtpInput onChange={setMfaCode} value={mfaCode} />
          </div>
          <SheetFooter>
            <Button
              disabled={mfaPending || mfaCode.length < 6}
              onClick={() => void verifyMfaAndContinue()}
              type="button"
            >
              {mfaPending ? "Verifying…" : "Verify and continue"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

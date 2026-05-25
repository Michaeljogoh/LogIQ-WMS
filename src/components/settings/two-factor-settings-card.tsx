"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { TwoFactorOtpInput } from "@/components/auth/two-factor-otp-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import {
  enableTwoFactorWithPassword,
  sendTwoFactorOtp,
  verifyTwoFactorOtp,
} from "@/lib/two-factor-enrollment";

export function TwoFactorSettingsCard() {
  const trpc = useTRPC();
  const statusQuery = useQuery(trpc.security.getTwoFactorStatus.queryOptions());
  const completeSetup = useMutation(
    trpc.security.completeTwoFactorSetup.mutationOptions({
      onSuccess: () => void statusQuery.refetch(),
    }),
  );
  const disableMutation = useMutation(
    trpc.security.disableTwoFactor.mutationOptions({
      onSuccess: () => {
        toast.success("Two-factor authentication turned off.");
        void statusQuery.refetch();
        setDisablePassword("");
        setEnabling(false);
        setOtpCode("");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const [enabling, setEnabling] = useState(false);
  const [enablePassword, setEnablePassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [pending, setPending] = useState(false);

  const enabled = statusQuery.data?.twoFactorEnabled === true;

  async function startEnable() {
    if (enablePassword.length < 8) {
      toast.error("Enter your password to enable two-factor authentication.");
      return;
    }
    setPending(true);
    try {
      await enableTwoFactorWithPassword(enablePassword);
      await sendTwoFactorOtp();
      setEnabling(true);
      toast.success("Verification code sent to your email.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not enable two-factor",
      );
    } finally {
      setPending(false);
    }
  }

  async function confirmEnable() {
    if (otpCode.length < 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setPending(true);
    try {
      await verifyTwoFactorOtp(otpCode, false);
      await completeSetup.mutateAsync();
      await authClient.getSession();
      setEnabling(false);
      setOtpCode("");
      setEnablePassword("");
      toast.success("Two-factor authentication is on.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Verification failed",
      );
    } finally {
      setPending(false);
    }
  }

  function onToggle(checked: boolean) {
    if (checked) {
      if (!enabled) {
        setEnabling(true);
      }
      return;
    }
    if (!disablePassword) {
      toast.error("Enter your password to turn off two-factor authentication.");
      return;
    }
    disableMutation.mutate({ password: disablePassword });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Two-factor authentication</CardTitle>
        <CardDescription>
          Email verification codes are used when you sign in. Two-factor is on
          by default; you can turn it off here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="two-factor-toggle">Two-factor authentication</Label>
            <p className="text-xs text-muted-foreground">
              {enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={statusQuery.isLoading || pending || disableMutation.isPending}
            id="two-factor-toggle"
            onCheckedChange={onToggle}
          />
        </div>

        {!enabled && (enabling || !statusQuery.data?.twoFactorEnabled) ? (
          <div className="space-y-4 border-t border-border/60 pt-4">
            <AuthPasswordField
              autoComplete="current-password"
              label="Password"
              onChange={(event) => setEnablePassword(event.target.value)}
              placeholder="Your password"
              value={enablePassword}
            />
            {enabling ? (
              <>
                <TwoFactorOtpInput onChange={setOtpCode} value={otpCode} />
                <Button disabled={pending} onClick={() => void confirmEnable()}>
                  Confirm with code
                </Button>
              </>
            ) : (
              <Button disabled={pending} onClick={() => void startEnable()}>
                Send verification code
              </Button>
            )}
          </div>
        ) : null}

        {enabled ? (
          <div className="space-y-2 border-t border-border/60 pt-4">
            <AuthPasswordField
              autoComplete="current-password"
              label="Password to turn off 2FA"
              onChange={(event) => setDisablePassword(event.target.value)}
              placeholder="Password"
              value={disablePassword}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { TwoFactorOtpInput } from "@/components/auth/two-factor-otp-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import {
  enableTwoFactorWithPassword,
  sendTwoFactorOtp,
  verifyTwoFactorOtp,
} from "@/lib/two-factor-enrollment";
import { cn } from "@/lib/utils";

type TwoFactorSettingsCardProps = Readonly<{
  onStatusChange?: () => void;
}>;

export function TwoFactorSettingsCard({ onStatusChange }: TwoFactorSettingsCardProps) {
  const trpc = useTRPC();
  const statusQuery = useQuery(trpc.security.getTwoFactorStatus.queryOptions());
  const completeSetup = useMutation(
    trpc.security.completeTwoFactorSetup.mutationOptions({
      onSuccess: () => {
        void statusQuery.refetch();
        onStatusChange?.();
      },
    }),
  );
  const disableMutation = useMutation(
    trpc.security.disableTwoFactor.mutationOptions({
      onSuccess: () => {
        toast.success("Two-factor authentication turned off.");
        void statusQuery.refetch();
        onStatusChange?.();
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
  const showEnableFlow =
    !enabled && (enabling || !statusQuery.data?.twoFactorEnabled);
  const enableStep = enabling ? 2 : 1;

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
    <section className="security-2fa-panel">
      <header className="security-2fa-panel-header">
        <div className="flex items-start gap-3">
          <div className="security-2fa-panel-icon">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Two-factor authentication
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Email verification codes are used when you sign in. Two-factor is
              on by default; you can turn it off here.
            </p>
          </div>
        </div>
      </header>

      <div className="security-2fa-panel-body space-y-5">
        <div className="security-2fa-toggle-row">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="two-factor-toggle" className="text-sm font-semibold">
              Two-factor authentication
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={enabled ? "success" : "warning"}>
                {enabled ? "Enabled" : "Disabled"}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {enabled
                  ? "Required at sign-in"
                  : "Not required at sign-in"}
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            disabled={
              statusQuery.isLoading || pending || disableMutation.isPending
            }
            id="two-factor-toggle"
            onCheckedChange={onToggle}
          />
        </div>

        {showEnableFlow ? (
          <div className="space-y-4">
            <div className="security-step-track">
              <div
                className={cn(
                  "security-step",
                  enableStep >= 1 && "security-step--active",
                  enableStep > 1 && "security-step--complete",
                )}
              >
                <span className="security-step-index">1</span>
                <span className="security-step-label">Confirm password</span>
              </div>
              <div className="security-step-connector" aria-hidden />
              <div
                className={cn(
                  "security-step",
                  enableStep >= 2 && "security-step--active",
                )}
              >
                <span className="security-step-index">2</span>
                <span className="security-step-label">Verify email code</span>
              </div>
            </div>

            <div className="dashboard-form-section space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <KeyRound className="size-4 text-muted-foreground" aria-hidden />
                {enabling ? "Enter the code from your email" : "Confirm your password"}
              </div>

              {!enabling ? (
                <>
                  <AuthPasswordField
                    autoComplete="current-password"
                    label="Password"
                    onChange={(event) => setEnablePassword(event.target.value)}
                    placeholder="Your password"
                    value={enablePassword}
                  />
                  <Button
                    className="w-full sm:w-auto"
                    disabled={pending}
                    onClick={() => void startEnable()}
                  >
                    Send verification code
                  </Button>
                </>
              ) : (
                <>
                  <div className="security-otp-block">
                    <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Mail className="size-3.5" aria-hidden />
                      Check your inbox for a 6-digit code
                    </div>
                    <TwoFactorOtpInput onChange={setOtpCode} value={otpCode} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={pending} onClick={() => void confirmEnable()}>
                      Confirm with code
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() => void startEnable()}
                      variant="outline"
                    >
                      Resend code
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {enabled ? (
          <div className="security-disable-zone space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Turn off two-factor
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Enter your password, then flip the switch above to disable email
                verification on sign-in.
              </p>
            </div>
            <AuthPasswordField
              autoComplete="current-password"
              label="Password to turn off 2FA"
              onChange={(event) => setDisablePassword(event.target.value)}
              placeholder="Password"
              value={disablePassword}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

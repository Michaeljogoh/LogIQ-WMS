"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { AUTH_HERO_IMAGES } from "@/components/auth/auth-assets";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { TwoFactorOtpInput } from "@/components/auth/two-factor-otp-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import {
  sendTwoFactorOtp,
  verifyTwoFactorOtp,
} from "@/lib/two-factor-enrollment";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return email;
  }
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}

export type TwoFactorCodeFormProps = Readonly<{
  title: string;
  description?: string;
  submitLabel: string;
  /** Send OTP when the page loads (sign-in challenge). */
  sendOtpOnMount?: boolean;
  showBackToSignIn?: boolean;
  defaultTrustDevice?: boolean;
  onVerified: () => Promise<void>;
}>;

export function TwoFactorCodeForm({
  title,
  description,
  submitLabel,
  sendOtpOnMount = false,
  showBackToSignIn = false,
  defaultTrustDevice = false,
  onVerified,
}: TwoFactorCodeFormProps) {
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(defaultTrustDevice);
  const [pending, setPending] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("your email");
  const [otpSent, setOtpSent] = useState(!sendOtpOnMount);

  useEffect(() => {
    void authClient.getSession().then((session) => {
      const email = session.data?.user?.email;
      if (email) {
        setMaskedEmail(maskEmail(email));
      }
    });
  }, []);

  useEffect(() => {
    if (!sendOtpOnMount || otpSent) {
      return;
    }
    void (async () => {
      try {
        await sendTwoFactorOtp();
        setOtpSent(true);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not send verification code",
        );
      }
    })();
  }, [sendOtpOnMount, otpSent]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.length < 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setPending(true);
    try {
      await verifyTwoFactorOtp(code, trustDevice);
      await onVerified();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Verification failed",
      );
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    setPending(true);
    try {
      await sendTwoFactorOtp();
      setOtpSent(true);
      toast.success("A new code has been sent.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not resend code",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplitLayout heroAlt="Verification" heroImage={AUTH_HERO_IMAGES.twoFactor}>
      <AuthHeader description={description} title={title} />

      <p className="-mt-4 mb-6 text-center text-sm text-[#64748b]">
        Enter the 6-digit code sent to{" "}
        <span className="font-medium text-[#334155]">{maskedEmail}</span>
      </p>

      {showBackToSignIn ? (
        <Link
          className="mb-6 block text-center text-sm font-medium text-[#4a7dff] hover:underline"
          href="/sign-in"
        >
          Use another account
        </Link>
      ) : null}

      <form className="space-y-6" onSubmit={onSubmit}>
        <TwoFactorOtpInput onChange={setCode} value={code} />

        <div className="flex items-center gap-2">
          <Checkbox
            checked={trustDevice}
            id="trust-device"
            onCheckedChange={(checked) => setTrustDevice(checked === true)}
          />
          <Label
            className="text-sm font-normal text-[#64748b]"
            htmlFor="trust-device"
          >
            Don&apos;t ask again on this device
          </Label>
        </div>

        <AuthPrimaryButton disabled={pending} type="submit">
          {submitLabel}
        </AuthPrimaryButton>
      </form>

      <p className="mt-6 text-center">
        <button
          className="text-sm font-medium text-[#4a7dff] hover:underline"
          disabled={pending}
          onClick={() => void resendCode()}
          type="button"
        >
          Didn&apos;t receive the code?
        </button>
      </p>
    </AuthSplitLayout>
  );
}

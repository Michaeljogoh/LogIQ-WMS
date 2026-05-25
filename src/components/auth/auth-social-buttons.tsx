"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthSocialButtonsProps = Readonly<{
  mode: "sign-in" | "sign-up";
  onGoogle?: () => void;
  onUps?: () => void;
  disabled?: boolean;
  compact?: boolean;
}>;

function GoogleIcon() {
  return (
    <svg aria-hidden className="size-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function UpsMark() {
  return (
    <span className="flex size-5 items-center justify-center rounded bg-[#351c15] text-[10px] font-bold text-[#ffb500]">
      UPS
    </span>
  );
}

export function AuthSocialButtons({
  mode,
  onGoogle,
  onUps,
  disabled,
  compact = false,
}: AuthSocialButtonsProps) {
  const verb = mode === "sign-in" ? "Sign in" : "Sign up";

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3")}>
      <button
        className={socialButtonClass}
        disabled={disabled || !onGoogle}
        onClick={onGoogle}
        type="button"
      >
        <GoogleIcon />
        <span>{verb} with google</span>
      </button>
      <button
        className={socialButtonClass}
        disabled={disabled}
        onClick={onUps}
        type="button"
      >
        <UpsMark />
        <span>{verb} with UPS</span>
      </button>
    </div>
  );
}

const socialButtonClass = cn(
  "flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white text-sm font-medium text-[#334155] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60",
);

export function AuthInlineSendButton({
  children = "Send",
  disabled,
  type = "submit",
}: Readonly<{
  children?: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
}>) {
  return (
    <button
      className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-lg bg-[#4a7dff] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3d6ef0] disabled:opacity-60"
      disabled={disabled}
      type={type}
    >
      {children}
      <ChevronRight className="size-4" />
    </button>
  );
}

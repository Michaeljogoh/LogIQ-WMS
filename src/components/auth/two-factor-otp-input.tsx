"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type TwoFactorOtpInputProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
}>;

export function TwoFactorOtpInput({ value, onChange }: TwoFactorOtpInputProps) {
  return (
    <div className="flex justify-center">
      <InputOTP maxLength={6} onChange={onChange} value={value}>
        <InputOTPGroup className="gap-2">
          <InputOTPSlot
            className="size-11 rounded-lg border-[#e2e8f0] text-base first:rounded-lg last:rounded-lg"
            index={0}
          />
          <InputOTPSlot
            className="size-11 rounded-lg border-[#e2e8f0] text-base"
            index={1}
          />
          <InputOTPSlot
            className="size-11 rounded-lg border-[#e2e8f0] text-base"
            index={2}
          />
        </InputOTPGroup>
        <InputOTPSeparator className="text-[#cbd5e1]" />
        <InputOTPGroup className="gap-2">
          <InputOTPSlot
            className="size-11 rounded-lg border-[#e2e8f0] text-base first:rounded-lg last:rounded-lg"
            index={3}
          />
          <InputOTPSlot
            className="size-11 rounded-lg border-[#e2e8f0] text-base"
            index={4}
          />
          <InputOTPSlot
            className="size-11 rounded-lg border-[#e2e8f0] text-base"
            index={5}
          />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

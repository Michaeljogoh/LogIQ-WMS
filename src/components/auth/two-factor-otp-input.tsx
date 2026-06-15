"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

const OTP_SLOT_CLASS = cn(
  "size-12 rounded-lg border-2 border-border bg-muted/60 text-lg font-semibold tabular-nums text-foreground shadow-sm",
  "first:rounded-lg last:rounded-lg",
  "data-[active=true]:border-primary data-[active=true]:bg-card data-[active=true]:ring-2 data-[active=true]:ring-ring/30",
);

type TwoFactorOtpInputProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
}>;

export function TwoFactorOtpInput({ value, onChange }: TwoFactorOtpInputProps) {
  return (
    <div className="flex justify-center py-1">
      <InputOTP maxLength={6} onChange={onChange} value={value}>
        <InputOTPGroup className="gap-2">
          <InputOTPSlot className={OTP_SLOT_CLASS} index={0} />
          <InputOTPSlot className={OTP_SLOT_CLASS} index={1} />
          <InputOTPSlot className={OTP_SLOT_CLASS} index={2} />
        </InputOTPGroup>
        <InputOTPSeparator className="mx-1 text-muted-foreground [&_svg]:size-5 [&_svg]:stroke-[2.5]" />
        <InputOTPGroup className="gap-2">
          <InputOTPSlot className={OTP_SLOT_CLASS} index={3} />
          <InputOTPSlot className={OTP_SLOT_CLASS} index={4} />
          <InputOTPSlot className={OTP_SLOT_CLASS} index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

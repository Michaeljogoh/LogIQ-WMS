import {
  EmailHeading,
  EmailLayout,
  EmailMuted,
  EmailText,
} from "./email-layout";

export type TwoFactorOtpEmailProps = Readonly<{
  otp: string;
}>;

export function TwoFactorOtpEmail(props: TwoFactorOtpEmailProps) {
  return (
    <EmailLayout preview="Your LogIQ WMS verification code">
      <EmailHeading>Verification code</EmailHeading>
      <EmailText>
        Use this code to complete sign-in or set up two-factor authentication:
      </EmailText>
      <EmailText>
        <strong style={{ fontSize: "24px", letterSpacing: "0.2em" }}>
          {props.otp}
        </strong>
      </EmailText>
      <EmailMuted>This code expires in a few minutes.</EmailMuted>
      <EmailMuted>
        If you did not request this code, you can ignore this email.
      </EmailMuted>
    </EmailLayout>
  );
}

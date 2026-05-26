import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailText,
} from "./email-layout";

export function ResetPasswordEmail(props: Readonly<{ url: string }>) {
  return (
    <EmailLayout preview="Reset your LogIQ WMS password">
      <EmailHeading>Reset your password</EmailHeading>
      <EmailText>
        We received a request to reset the password for your LogIQ WMS account.
        Click the button below to choose a new password. This link expires in
        one hour.
      </EmailText>
      <EmailButton href={props.url}>Reset password</EmailButton>
      <EmailText>
        If you did not request a password reset, you can safely ignore this
        email.
      </EmailText>
    </EmailLayout>
  );
}

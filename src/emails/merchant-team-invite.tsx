import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailMuted,
  EmailText,
} from "./email-layout";

export type MerchantTeamInviteEmailProps = Readonly<{
  merchantName: string;
  roleLabel: string;
  permissionLabels: string[];
  signInUrl: string;
  resetPasswordUrl: string;
  email: string;
  temporaryPassword: string;
}>;

export function MerchantTeamInviteEmail(props: MerchantTeamInviteEmailProps) {
  const permissions =
    props.permissionLabels.length > 0
      ? props.permissionLabels.join(", ")
      : "Full access (owner)";

  return (
    <EmailLayout preview={`You're invited to ${props.merchantName} on LogIQ WMS`}>
      <EmailHeading>LogIQ WMS</EmailHeading>
      <EmailText>
        You have been invited to access <strong>{props.merchantName}</strong> as
        a <strong>{props.roleLabel}</strong>.
      </EmailText>
      <EmailText>
        <strong>Portal permissions:</strong> {permissions}
      </EmailText>
      <EmailText>
        Use the credentials below to sign in to the merchant portal.
      </EmailText>
      <EmailText>
        <strong>Sign-in URL:</strong> {props.signInUrl}
        <br />
        <strong>Email:</strong> {props.email}
        <br />
        <strong>Temporary password:</strong> {props.temporaryPassword}
      </EmailText>
      <EmailButton href={props.signInUrl}>Sign in to merchant portal</EmailButton>
      <EmailMuted>
        For security, change your password after your first sign-in. You can use{" "}
        <a href={props.resetPasswordUrl}>Forgot password</a> on the sign-in page
        if you need to reset it later.
      </EmailMuted>
      <EmailMuted>
        If you did not expect this invitation, you can ignore this email.
      </EmailMuted>
    </EmailLayout>
  );
}

import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailMuted,
  EmailText,
} from "./email-layout";

export type OperatorTeamInviteEmailProps = Readonly<{
  accountName: string;
  roleLabel: string;
  warehouseNames: string[];
  signInUrl: string;
  resetPasswordUrl: string;
  email: string;
  temporaryPassword: string;
}>;

export function OperatorTeamInviteEmail(props: OperatorTeamInviteEmailProps) {
  const warehouses =
    props.warehouseNames.length > 0
      ? props.warehouseNames.join(", ")
      : "—";

  return (
    <EmailLayout preview={`You're invited to ${props.accountName} on LogIQ WMS`}>
      <EmailHeading>LogIQ WMS</EmailHeading>
      <EmailText>
        You have been invited to join <strong>{props.accountName}</strong> as a{" "}
        <strong>{props.roleLabel}</strong>.
      </EmailText>
      <EmailText>
        <strong>Assigned warehouses:</strong> {warehouses}
      </EmailText>
      <EmailText>Use the credentials below to sign in to your operator dashboard.</EmailText>
      <EmailText>
        <strong>Sign-in URL:</strong> {props.signInUrl}
        <br />
        <strong>Email:</strong> {props.email}
        <br />
        <strong>Temporary password:</strong> {props.temporaryPassword}
      </EmailText>
      <EmailButton href={props.signInUrl}>Sign in to dashboard</EmailButton>
      <EmailMuted>
        For security, change your password after your first sign-in. You can use{" "}
        <a href={props.resetPasswordUrl}>Forgot password</a> on the sign-in page if
        you need to reset it later.
      </EmailMuted>
      <EmailMuted>
        If you did not expect this invitation, you can ignore this email.
      </EmailMuted>
    </EmailLayout>
  );
}

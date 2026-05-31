import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailMuted,
  EmailText,
} from "./email-layout";

export type PlatformSupportAccessRequestEmailProps = Readonly<{
  accountName: string;
  platformAdminName: string;
  platformAdminEmail: string;
  reason: string;
  approveUrl: string;
  expiresAt: Date;
}>;

export function PlatformSupportAccessRequestEmail(
  props: PlatformSupportAccessRequestEmailProps,
) {
  return (
    <EmailLayout
      preview={`LogIQ support requests emergency access to ${props.accountName}`}
    >
      <EmailHeading>Emergency support access request</EmailHeading>
      <EmailText>
        <strong>{props.platformAdminName}</strong> ({props.platformAdminEmail}),
        a LogIQ platform administrator, is requesting{" "}
        <strong>emergency impersonation access</strong> to your workspace{" "}
        <strong>{props.accountName}</strong>.
      </EmailText>
      <EmailText>
        <strong>Reason provided:</strong>
        <br />
        {props.reason}
      </EmailText>
      <EmailText>
        If you approve, they may use operator tools on your account for a limited
        time. All actions are audited. If you did not expect this request, deny it
        and contact LogIQ.
      </EmailText>
      <EmailButton href={props.approveUrl}>Review request</EmailButton>
      <EmailMuted>
        This link expires on {props.expiresAt.toLocaleString()}. Only an account
        owner can approve or deny.
      </EmailMuted>
    </EmailLayout>
  );
}

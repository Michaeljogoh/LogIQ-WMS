import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailMuted,
  EmailText,
} from "./email-layout";

export function MerchantInviteEmail(props: Readonly<{ url: string }>) {
  return (
    <EmailLayout preview="Your LogIQ WMS invitation">
      <EmailHeading>LogIQ WMS</EmailHeading>
      <EmailText>
        You have been invited to access the merchant portal. Click the button
        below to sign in and complete setup.
      </EmailText>
      <EmailButton href={props.url}>Accept invitation</EmailButton>
      <EmailMuted>
        If you did not expect this email, you can ignore it.
      </EmailMuted>
    </EmailLayout>
  );
}

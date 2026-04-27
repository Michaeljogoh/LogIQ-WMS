import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailText,
} from "./email-layout";

export function VerificationEmail(props: Readonly<{ url: string }>) {
  return (
    <EmailLayout preview="Verify your LogIQ WMS email">
      <EmailHeading>Verify your email</EmailHeading>
      <EmailText>
        Confirm this address to finish setting up your LogIQ WMS account.
      </EmailText>
      <EmailButton href={props.url}>Verify email</EmailButton>
    </EmailLayout>
  );
}

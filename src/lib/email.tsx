import { render } from "react-email";
import { Resend } from "resend";
import { MerchantInviteEmail } from "@/emails/merchant-invite";
import { VerificationEmail } from "@/emails/verification-email";

const resendApiKey = process.env.RESEND_API_KEY;

function getResend(): Resend | null {
  if (!resendApiKey) {
    return null;
  }
  return new Resend(resendApiKey);
}

const defaultFrom =
  process.env.RESEND_FROM_EMAIL ?? "LogIQ WMS <onboarding@resend.dev>";

export async function sendMerchantInviteEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  const resend = getResend();
  const html = await render(<MerchantInviteEmail url={params.url} />);

  if (!resend) {
    console.info("[email] RESEND_API_KEY missing; merchant invite:", params);
    return;
  }

  const { error } = await resend.emails.send({
    from: defaultFrom,
    to: params.to,
    subject: "Your LogIQ WMS invitation",
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendVerificationEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  const resend = getResend();
  const html = await render(<VerificationEmail url={params.url} />);

  if (!resend) {
    console.info("[email] RESEND_API_KEY missing; verification:", params);
    return;
  }

  const { error } = await resend.emails.send({
    from: defaultFrom,
    to: params.to,
    subject: "Verify your LogIQ WMS email",
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}

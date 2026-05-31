import "server-only";

import { ServerClient } from "postmark";
import { render } from "react-email";
import { LogiqInsightDigestEmail } from "@/emails/logiq-insight-digest";
import { MerchantInviteEmail } from "@/emails/merchant-invite";
import {
  MerchantTeamInviteEmail,
  type MerchantTeamInviteEmailProps,
} from "@/emails/merchant-team-invite";
import {
  OperatorTeamInviteEmail,
  type OperatorTeamInviteEmailProps,
} from "@/emails/operator-team-invite";
import { ResetPasswordEmail } from "@/emails/reset-password-email";
import { TwoFactorOtpEmail } from "@/emails/two-factor-otp";
import {
  PlatformSupportAccessRequestEmail,
  type PlatformSupportAccessRequestEmailProps,
} from "@/emails/platform-support-access-request";
import { VerificationEmail } from "@/emails/verification-email";

const postmarkServerToken = process.env.POSTMARK_SERVER_TOKEN;

function getPostmarkClient(): ServerClient | null {
  if (!postmarkServerToken?.trim()) {
    return null;
  }
  return new ServerClient(postmarkServerToken);
}

function getDefaultFrom(): string {
  const from = process.env.POSTMARK_FROM?.trim();
  if (!from) {
    return "LogIQ WMS <noreply@luceoapp.com>";
  }
  if (from.includes("<")) {
    return from;
  }
  return `LogIQ WMS <${from}>`;
}

async function sendHtmlEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  const client = getPostmarkClient();

  if (!client) {
    console.info(
      "[email] POSTMARK_SERVER_TOKEN missing; skipped send:",
      params.subject,
      "→",
      params.to,
    );
    return;
  }

  try {
    await client.sendEmail({
      From: params.from ?? getDefaultFrom(),
      To: params.to,
      Subject: params.subject,
      HtmlBody: params.html,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Postmark send failed";
    throw new Error(message);
  }
}

export async function sendMerchantInviteEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  const html = await render(<MerchantInviteEmail url={params.url} />);
  await sendHtmlEmail({
    to: params.to,
    subject: "Your LogIQ WMS invitation",
    html,
  });
}

export async function sendLogiqInsightDigestEmail(params: {
  to: string;
  accountName: string;
  insights: Array<{
    severity: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
}): Promise<void> {
  const html = await render(
    <LogiqInsightDigestEmail
      accountName={params.accountName}
      insights={params.insights}
    />,
  );
  await sendHtmlEmail({
    to: params.to,
    subject: `LogIQ insight digest — ${params.accountName}`,
    html,
  });
}

export async function sendMerchantTeamInviteEmail(
  params: MerchantTeamInviteEmailProps & { to: string },
): Promise<void> {
  const { to, ...emailProps } = params;
  const html = await render(<MerchantTeamInviteEmail {...emailProps} />);
  await sendHtmlEmail({
    to,
    subject: `You're invited to ${params.merchantName} on LogIQ WMS`,
    html,
  });
}

export async function sendOperatorTeamInviteEmail(
  params: OperatorTeamInviteEmailProps & { to: string },
): Promise<void> {
  const { to, ...emailProps } = params;
  const html = await render(<OperatorTeamInviteEmail {...emailProps} />);
  await sendHtmlEmail({
    to,
    subject: `You're invited to ${params.accountName} on LogIQ WMS`,
    html,
  });
}

export async function sendTwoFactorOtpEmail(params: {
  to: string;
  otp: string;
}): Promise<void> {
  const html = await render(<TwoFactorOtpEmail otp={params.otp} />);
  await sendHtmlEmail({
    to: params.to,
    subject: "Your LogIQ WMS verification code",
    html,
  });
}

export async function sendResetPasswordEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  const html = await render(<ResetPasswordEmail url={params.url} />);
  await sendHtmlEmail({
    to: params.to,
    subject: "Reset your LogIQ WMS password",
    html,
  });
}

export async function sendPlatformSupportAccessRequestEmail(
  params: PlatformSupportAccessRequestEmailProps & { to: string },
): Promise<void> {
  const { to, ...emailProps } = params;
  const html = await render(
    <PlatformSupportAccessRequestEmail {...emailProps} />,
  );
  await sendHtmlEmail({
    to,
    subject: `Emergency support access requested — ${params.accountName}`,
    html,
  });
}

export async function sendVerificationEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  const html = await render(<VerificationEmail url={params.url} />);
  await sendHtmlEmail({
    to: params.to,
    subject: "Verify your LogIQ WMS email",
    html,
  });
}

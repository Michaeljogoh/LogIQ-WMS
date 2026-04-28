import { NextResponse } from "next/server";

export function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri =
    process.env.SLACK_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/integrations/slack/callback`;
  if (!clientId) {
    return NextResponse.json(
      { error: "SLACK_CLIENT_ID not configured." },
      { status: 400 },
    );
  }
  const url = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(
    clientId,
  )}&scope=${encodeURIComponent("chat:write,incoming-webhook")}&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}`;
  return NextResponse.redirect(url);
}

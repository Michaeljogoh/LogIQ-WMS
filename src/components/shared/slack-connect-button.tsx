"use client";

import { Button } from "@/components/ui/button";

export function SlackConnectButton() {
  const oauthUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/oauth`
    : "/api/integrations/slack/oauth";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        window.open(oauthUrl, "_blank", "noopener,noreferrer");
      }}
    >
      Connect Slack
    </Button>
  );
}

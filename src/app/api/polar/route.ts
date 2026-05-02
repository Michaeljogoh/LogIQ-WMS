import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyPolarSubscriptionCancelled,
  applyPolarSubscriptionToAccount,
} from "@/server/billing/subscription-sync";

export async function POST(req: NextRequest) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { received: false, error: "POLAR_WEBHOOK_SECRET not set" },
      { status: 500 },
    );
  }

  const body = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  };

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headers, secret);
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return NextResponse.json({ received: false }, { status: 403 });
    }
    throw e;
  }

  switch (event.type) {
    case "subscription.created":
    case "subscription.updated":
    case "subscription.active":
    case "subscription.uncanceled": {
      await applyPolarSubscriptionToAccount(event.data);
      break;
    }
    case "subscription.canceled":
    case "subscription.revoked": {
      await applyPolarSubscriptionCancelled(event.data);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

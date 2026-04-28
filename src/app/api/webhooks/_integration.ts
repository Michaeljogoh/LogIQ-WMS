import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueueIntegrationSyncJob } from "@/server/jobs/integration-sync";
import type { IntegrationType } from "@/generated/prisma/client";

export async function handleIntegrationWebhook(args: {
  request: Request;
  type: IntegrationType;
}) {
  // Signature verification can be expanded per platform using provider-specific headers.
  const integrationId = args.request.headers.get("x-logiq-integration-id");
  if (!integrationId) {
    return NextResponse.json(
      { error: "Missing x-logiq-integration-id header" },
      { status: 400 },
    );
  }
  const integration = await db.integration.findFirst({
    where: { id: integrationId, type: args.type },
    select: { id: true },
  });
  if (!integration) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 },
    );
  }
  await enqueueIntegrationSyncJob({
    integrationId: integration.id,
    trigger: "webhook",
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}

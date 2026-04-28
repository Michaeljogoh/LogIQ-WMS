import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  authenticateApiRequest,
  withApiErrorHandling,
} from "@/app/api/v1/_lib";

const createWebhookSchema = z.object({
  url: z.string().url(),
});

export async function GET() {
  return withApiErrorHandling(async () => {
    const auth = await authenticateApiRequest("webhooks:read");
    if (!auth.ok) {
      return auth.response;
    }
    const endpoints = await db.webhookEndpoint.findMany({
      where: { accountId: auth.accountId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ items: endpoints });
  });
}

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    const auth = await authenticateApiRequest("webhooks:write");
    if (!auth.ok) {
      return auth.response;
    }
    const body = createWebhookSchema.parse(await request.json());
    const secret = crypto.randomBytes(24).toString("hex");
    const endpoint = await db.webhookEndpoint.upsert({
      where: {
        accountId_url: {
          accountId: auth.accountId,
          url: body.url,
        },
      },
      update: { isActive: true, secret },
      create: {
        accountId: auth.accountId,
        url: body.url,
        secret,
      },
      select: {
        id: true,
        url: true,
        isActive: true,
      },
    });
    return NextResponse.json(
      {
        ...endpoint,
        secret,
      },
      { status: 201 },
    );
  });
}

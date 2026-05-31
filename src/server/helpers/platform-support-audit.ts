import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/server/helpers/audit-log";

export async function logPlatformSupportAudit(params: {
  platformAdminUserId: string;
  accountId?: string | null;
  action: string;
  reason?: string | null;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const admin = await db.user.findUnique({
    where: { id: params.platformAdminUserId },
    select: { email: true, name: true },
  });

  await logAuditEvent({
    actorUserId: params.platformAdminUserId,
    actorEmail: admin?.email,
    actorName: admin?.name,
    systemRole: "PLATFORM_ADMIN",
    accountId: params.accountId,
    action: params.action,
    source: "SUPPORT",
    reason: params.reason,
    ipAddress: params.ipAddress,
    metadata: params.metadata,
  });

  await db.platformSupportAuditLog.create({
    data: {
      platformAdminUserId: params.platformAdminUserId,
      accountId: params.accountId ?? null,
      action: params.action,
      reason: params.reason ?? null,
      ipAddress: params.ipAddress ?? null,
      metadata: params.metadata ?? undefined,
    },
  });
}

export function getClientIpFromRequest(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return req.headers.get("x-real-ip");
}

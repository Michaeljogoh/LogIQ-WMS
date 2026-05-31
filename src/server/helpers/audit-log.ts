import "server-only";

import type {
  AuditEventSource,
  Prisma,
  SystemRole,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AUDIT_SKIP_PROCEDURE_PREFIXES } from "@/lib/audit";
import { isSystemRole } from "@/lib/system-roles";
import { getClientIpFromRequest } from "@/server/helpers/platform-support-audit";

export function shouldSkipAuditProcedure(path: string): boolean {
  return AUDIT_SKIP_PROCEDURE_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );
}

export async function logAuditEvent(params: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  systemRole?: string | null;
  accountId?: string | null;
  merchantId?: string | null;
  action: string;
  source?: AuditEventSource;
  procedurePath?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const role = isSystemRole(params.systemRole ?? undefined)
    ? params.systemRole
    : null;

  await db.auditEvent.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      actorEmail: params.actorEmail ?? null,
      actorName: params.actorName ?? null,
      systemRole: role as SystemRole | null,
      accountId: params.accountId ?? null,
      merchantId: params.merchantId ?? null,
      action: params.action,
      source: params.source ?? "TRPC",
      procedurePath: params.procedurePath ?? null,
      reason: params.reason ?? null,
      ipAddress: params.ipAddress ?? null,
      metadata: params.metadata ?? undefined,
    },
  });
}

type AuditCtx = {
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  systemRole: string | null;
  accountId?: string | null;
  merchantId?: string | null;
  req: Request;
};

export async function logAuditFromTrpcMutation(
  ctx: AuditCtx,
  procedurePath: string,
): Promise<void> {
  if (!ctx.userId || shouldSkipAuditProcedure(procedurePath)) {
    return;
  }

  await logAuditEvent({
    actorUserId: ctx.userId,
    actorEmail: ctx.userEmail,
    actorName: ctx.userName,
    systemRole: ctx.systemRole,
    accountId: ctx.accountId ?? null,
    merchantId: ctx.merchantId ?? null,
    action: procedurePath.replaceAll(".", "_").toUpperCase(),
    source: "TRPC",
    procedurePath,
    ipAddress: getClientIpFromRequest(ctx.req),
  });
}

import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { addHours, addMinutes, isPast } from "date-fns";
import { cookies } from "next/headers";
import type { PlatformSupportLevel } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  PLATFORM_ACTIVE_ACCOUNT_COOKIE,
  PLATFORM_SUPPORT_MFA_COOKIE,
  PLATFORM_SUPPORT_SESSION_COOKIE,
  SUPPORT_CONSTANTS,
} from "@/lib/platform-support";
import { parseActiveAccountIdFromCookieHeader } from "@/lib/platform-account";
import { PLATFORM_INTERNAL_ACCOUNT_SLUG } from "@/lib/system-roles";
import { tenantAccountListWhere } from "@/server/helpers/resolve-tenant-account";
import { logPlatformSupportAudit } from "@/server/helpers/platform-support-audit";

export type ActivePlatformSupportSession = {
  id: string;
  accountId: string;
  accountName: string;
  level: PlatformSupportLevel;
  reason: string;
  expiresAt: Date;
  accessRequestId: string | null;
};

function parseCookieValue(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(";").map((p) => p.trim())) {
    if (part.startsWith(`${name}=`)) {
      const value = part.slice(name.length + 1);
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

export function hashSupportApprovalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSupportApprovalToken(): string {
  return randomBytes(32).toString("hex");
}

async function loadSessionById(
  sessionId: string,
): Promise<ActivePlatformSupportSession | null> {
  const row = await db.platformSupportSession.findUnique({
    where: { id: sessionId },
    include: {
      account: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!row || row.endedAt || isPast(row.expiresAt)) {
    return null;
  }

  if (row.account.slug === PLATFORM_INTERNAL_ACCOUNT_SLUG) {
    return null;
  }

  return {
    id: row.id,
    accountId: row.accountId,
    accountName: row.account.name,
    level: row.level,
    reason: row.reason,
    expiresAt: row.expiresAt,
    accessRequestId: row.accessRequestId,
  };
}

export async function getActivePlatformSupportSession(
  cookieHeader?: string | null,
): Promise<ActivePlatformSupportSession | null> {
  const jar = await cookies();
  const sessionId =
    jar.get(PLATFORM_SUPPORT_SESSION_COOKIE)?.value ??
    parseCookieValue(cookieHeader ?? null, PLATFORM_SUPPORT_SESSION_COOKIE);

  if (sessionId) {
    const session = await loadSessionById(sessionId);
    if (session) {
      return session;
    }
  }

  return null;
}

/** Legacy cookie migration: end if only old cookie without valid session. */
export async function resolvePlatformTenantAccountId(params: {
  cookieHeader?: string | null;
  supportSession: ActivePlatformSupportSession | null;
}): Promise<string | null> {
  if (params.supportSession) {
    return params.supportSession.accountId;
  }

  const legacyId = parseActiveAccountIdFromCookieHeader(params.cookieHeader);
  if (!legacyId) {
    return null;
  }

  return legacyId;
}

export async function endPlatformSupportSession(params: {
  sessionId: string;
  platformAdminUserId: string;
  ipAddress?: string | null;
}): Promise<void> {
  const session = await db.platformSupportSession.findUnique({
    where: { id: params.sessionId },
    select: { id: true, accountId: true, level: true, platformAdminUserId: true },
  });

  if (!session || session.platformAdminUserId !== params.platformAdminUserId) {
    return;
  }

  await db.platformSupportSession.update({
    where: { id: session.id },
    data: { endedAt: new Date() },
  });

  await logPlatformSupportAudit({
    platformAdminUserId: params.platformAdminUserId,
    accountId: session.accountId,
    action: "SUPPORT_SESSION_ENDED",
    reason: session.level,
    ipAddress: params.ipAddress,
  });
}

export async function createReadOnlySupportSession(params: {
  accountId: string;
  platformAdminUserId: string;
  reason: string;
  ipAddress?: string | null;
}): Promise<ActivePlatformSupportSession> {
  const account = await db.logiqAccount.findFirst({
    where: { id: params.accountId, ...tenantAccountListWhere() },
    select: { id: true, name: true },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  await db.platformSupportSession.updateMany({
    where: {
      platformAdminUserId: params.platformAdminUserId,
      endedAt: null,
    },
    data: { endedAt: new Date() },
  });

  const expiresAt = addHours(
    new Date(),
    SUPPORT_CONSTANTS.readOnlySessionHours,
  );

  const session = await db.platformSupportSession.create({
    data: {
      accountId: account.id,
      platformAdminUserId: params.platformAdminUserId,
      level: "READ_ONLY",
      reason: params.reason.trim(),
      expiresAt,
    },
    include: { account: { select: { name: true } } },
  });

  await logPlatformSupportAudit({
    platformAdminUserId: params.platformAdminUserId,
    accountId: account.id,
    action: "SUPPORT_SESSION_STARTED",
    reason: params.reason,
    ipAddress: params.ipAddress,
    metadata: { level: "READ_ONLY", sessionId: session.id },
  });

  return {
    id: session.id,
    accountId: session.accountId,
    accountName: session.account.name,
    level: "READ_ONLY",
    reason: session.reason,
    expiresAt: session.expiresAt,
    accessRequestId: null,
  };
}

export async function createEmergencySupportSession(params: {
  accessRequestId: string;
  platformAdminUserId: string;
  ipAddress?: string | null;
}): Promise<ActivePlatformSupportSession> {
  const request = await db.platformSupportAccessRequest.findUnique({
    where: { id: params.accessRequestId },
    include: { account: { select: { id: true, name: true } } },
  });

  if (!request) {
    throw new Error("Access request not found");
  }

  if (request.requestedByUserId !== params.platformAdminUserId) {
    throw new Error("Forbidden");
  }

  if (request.status !== "APPROVED") {
    throw new Error("Access request is not approved");
  }

  if (request.consumedAt) {
    throw new Error("Access request already used");
  }

  if (isPast(request.requestExpiresAt)) {
    await db.platformSupportAccessRequest.update({
      where: { id: request.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("Access request has expired");
  }

  const expiresAt =
    request.impersonationExpiresAt ??
    addHours(new Date(), SUPPORT_CONSTANTS.emergencySessionHours);

  if (isPast(expiresAt)) {
    throw new Error("Approved impersonation window has expired");
  }

  await db.platformSupportSession.updateMany({
    where: {
      platformAdminUserId: params.platformAdminUserId,
      endedAt: null,
    },
    data: { endedAt: new Date() },
  });

  const session = await db.platformSupportSession.create({
    data: {
      accountId: request.accountId,
      platformAdminUserId: params.platformAdminUserId,
      level: "EMERGENCY_IMPERSONATION",
      reason: request.reason,
      expiresAt,
      accessRequestId: request.id,
    },
    include: { account: { select: { name: true } } },
  });

  await db.platformSupportAccessRequest.update({
    where: { id: request.id },
    data: { status: "CONSUMED", consumedAt: new Date() },
  });

  await logPlatformSupportAudit({
    platformAdminUserId: params.platformAdminUserId,
    accountId: request.accountId,
    action: "EMERGENCY_IMPERSONATION_STARTED",
    reason: request.reason,
    ipAddress: params.ipAddress,
    metadata: {
      sessionId: session.id,
      accessRequestId: request.id,
    },
  });

  return {
    id: session.id,
    accountId: session.accountId,
    accountName: session.account.name,
    level: "EMERGENCY_IMPERSONATION",
    reason: session.reason,
    expiresAt: session.expiresAt,
    accessRequestId: request.id,
  };
}

export async function isPlatformSupportMfaFresh(
  cookieHeader?: string | null,
): Promise<boolean> {
  const jar = await cookies();
  const raw =
    jar.get(PLATFORM_SUPPORT_MFA_COOKIE)?.value ??
    parseCookieValue(cookieHeader ?? null, PLATFORM_SUPPORT_MFA_COOKIE);

  if (!raw) {
    return false;
  }

  const verifiedAt = new Date(raw);
  if (Number.isNaN(verifiedAt.getTime())) {
    return false;
  }

  const deadline = addMinutes(
    verifiedAt,
    SUPPORT_CONSTANTS.mfaVerificationWindowMinutes,
  );
  return !isPast(deadline);
}

export async function clearSupportCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(PLATFORM_SUPPORT_SESSION_COOKIE);
  jar.delete(PLATFORM_ACTIVE_ACCOUNT_COOKIE);
  jar.delete(PLATFORM_SUPPORT_MFA_COOKIE);
}

export async function setSupportSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.delete(PLATFORM_ACTIVE_ACCOUNT_COOKIE);
  jar.set(PLATFORM_SUPPORT_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function setSupportMfaCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(PLATFORM_SUPPORT_MFA_COOKIE, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SUPPORT_CONSTANTS.mfaVerificationWindowMinutes * 60,
  });
}

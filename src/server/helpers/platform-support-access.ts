import "server-only";

import { addHours, isPast } from "date-fns";
import { db } from "@/lib/db";
import { SUPPORT_CONSTANTS } from "@/lib/platform-support";
import { tenantAccountListWhere } from "@/server/helpers/resolve-tenant-account";
import {
  generateSupportApprovalToken,
  hashSupportApprovalToken,
} from "@/server/helpers/platform-support-session";
import { logPlatformSupportAudit } from "@/server/helpers/platform-support-audit";
import { sendPlatformSupportAccessRequestEmail } from "@/lib/email";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

export async function createEmergencyAccessRequest(params: {
  accountId: string;
  platformAdminUserId: string;
  platformAdminEmail: string;
  platformAdminName: string;
  reason: string;
  ipAddress?: string | null;
}): Promise<{ requestId: string; expiresAt: Date }> {
  const account = await db.logiqAccount.findFirst({
    where: { id: params.accountId, ...tenantAccountListWhere() },
    select: {
      id: true,
      name: true,
      users: {
        where: { systemRole: "THREEPL_ACCOUNT_OWNER", isActive: true },
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  const owners = account.users;
  if (owners.length === 0) {
    throw new Error(
      "No active account owner on this tenant — cannot request emergency access.",
    );
  }

  const token = generateSupportApprovalToken();
  const requestExpiresAt = addHours(
    new Date(),
    SUPPORT_CONSTANTS.accessRequestExpiryHours,
  );

  const request = await db.platformSupportAccessRequest.create({
    data: {
      accountId: account.id,
      requestedByUserId: params.platformAdminUserId,
      reason: params.reason.trim(),
      approvalTokenHash: hashSupportApprovalToken(token),
      requestExpiresAt,
    },
  });

  const approveUrl = `${baseURL}/support-access/approve/${token}`;

  for (const owner of owners) {
    await sendPlatformSupportAccessRequestEmail({
      to: owner.email,
      accountName: account.name,
      platformAdminName: params.platformAdminName,
      platformAdminEmail: params.platformAdminEmail,
      reason: params.reason,
      approveUrl,
      expiresAt: requestExpiresAt,
    });
  }

  console.info(
    "[platform-support] Emergency access requested for",
    account.name,
    "→",
    owners.map((o) => o.email).join(", "),
    "| Approve:",
    approveUrl,
  );

  await logPlatformSupportAudit({
    platformAdminUserId: params.platformAdminUserId,
    accountId: account.id,
    action: "EMERGENCY_ACCESS_REQUESTED",
    reason: params.reason,
    ipAddress: params.ipAddress,
    metadata: { requestId: request.id },
  });

  return { requestId: request.id, expiresAt: requestExpiresAt };
}

export async function approveEmergencyAccessByToken(params: {
  token: string;
  approverAccountUserId: string;
  approverUserId: string;
  ipAddress?: string | null;
}): Promise<{ accountName: string }> {
  const hash = hashSupportApprovalToken(params.token);
  const request = await db.platformSupportAccessRequest.findUnique({
    where: { approvalTokenHash: hash },
    include: { account: { select: { id: true, name: true } } },
  });

  if (!request) {
    throw new Error("Invalid or expired approval link");
  }

  if (request.status !== "PENDING") {
    throw new Error(`This request was already ${request.status.toLowerCase()}`);
  }

  if (isPast(request.requestExpiresAt)) {
    await db.platformSupportAccessRequest.update({
      where: { id: request.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("This access request has expired");
  }

  const approver = await db.accountUser.findFirst({
    where: {
      id: params.approverAccountUserId,
      accountId: request.accountId,
      betterAuthUserId: params.approverUserId,
      systemRole: "THREEPL_ACCOUNT_OWNER",
      isActive: true,
    },
    select: { id: true },
  });

  if (!approver) {
    throw new Error("Only the tenant account owner can approve emergency access");
  }

  const impersonationExpiresAt = addHours(
    new Date(),
    SUPPORT_CONSTANTS.emergencySessionHours,
  );

  await db.platformSupportAccessRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedByAccountUserId: approver.id,
      impersonationExpiresAt,
    },
  });

  await logPlatformSupportAudit({
    platformAdminUserId: request.requestedByUserId,
    accountId: request.accountId,
    action: "EMERGENCY_ACCESS_APPROVED",
    reason: request.reason,
    ipAddress: params.ipAddress,
    metadata: {
      requestId: request.id,
      approvedByAccountUserId: approver.id,
    },
  });

  return { accountName: request.account.name };
}

export async function denyEmergencyAccessByToken(params: {
  token: string;
  approverAccountUserId: string;
  approverUserId: string;
  ipAddress?: string | null;
}): Promise<void> {
  const hash = hashSupportApprovalToken(params.token);
  const request = await db.platformSupportAccessRequest.findUnique({
    where: { approvalTokenHash: hash },
  });

  if (!request || request.status !== "PENDING") {
    throw new Error("Invalid or already handled request");
  }

  const approver = await db.accountUser.findFirst({
    where: {
      id: params.approverAccountUserId,
      accountId: request.accountId,
      betterAuthUserId: params.approverUserId,
      systemRole: "THREEPL_ACCOUNT_OWNER",
      isActive: true,
    },
    select: { id: true },
  });

  if (!approver) {
    throw new Error("Only the tenant account owner can deny emergency access");
  }

  await db.platformSupportAccessRequest.update({
    where: { id: request.id },
    data: {
      status: "DENIED",
      deniedAt: new Date(),
      approvedByAccountUserId: approver.id,
    },
  });

  await logPlatformSupportAudit({
    platformAdminUserId: request.requestedByUserId,
    accountId: request.accountId,
    action: "EMERGENCY_ACCESS_DENIED",
    reason: request.reason,
    ipAddress: params.ipAddress,
    metadata: { requestId: request.id },
  });
}

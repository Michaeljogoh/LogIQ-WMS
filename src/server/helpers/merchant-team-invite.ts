import { TRPCError } from "@trpc/server";
import type { MerchantPermission } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendMerchantTeamInviteEmail } from "@/lib/email";
import { revokeBetterAuthSessions } from "@/lib/revoke-sessions";
import {
  generateTemporaryPassword,
  splitName,
  upsertCredentialAuthUser,
} from "@/server/helpers/auth-credential-user";

const MERCHANT_INVITE_ROLES = ["MERCHANT_OWNER", "MERCHANT_USER"] as const;
export type InvitableMerchantRole = (typeof MERCHANT_INVITE_ROLES)[number];

export type InviteMerchantUserInput = {
  accountId: string;
  merchantId: string;
  email: string;
  name: string;
  systemRole: InvitableMerchantRole;
  permissions: MerchantPermission[];
  invitedBy: string;
  /** When the row already exists (3PL merchant create). */
  merchantUserId?: string;
};

function permissionLabels(permissions: MerchantPermission[]): string[] {
  const labels: Record<MerchantPermission, string> = {
    READ: "Read",
    WRITE: "Write",
    BILLING: "Billing",
  };
  return permissions.map((p) => labels[p]);
}

function defaultNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "User";
  return local.replace(/[._-]+/g, " ").trim() || "User";
}

export async function inviteMerchantUser(
  input: InviteMerchantUserInput,
): Promise<{ merchantUserId: string }> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.name.trim() || defaultNameFromEmail(email);
  const { firstName, lastName } = splitName(displayName);

  if (
    input.systemRole === "MERCHANT_USER" &&
    input.permissions.length === 0
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select at least one permission for merchant users.",
    });
  }

  const merchant = await db.merchant.findFirst({
    where: { id: input.merchantId, accountId: input.accountId },
    select: { id: true, name: true },
  });
  if (!merchant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found." });
  }

  const existingOnMerchant = await db.merchantUser.findFirst({
    where: { merchantId: input.merchantId, email },
  });

  if (
    existingOnMerchant?.systemRole === "MERCHANT_OWNER" &&
    input.systemRole === "MERCHANT_USER" &&
    existingOnMerchant.id !== input.merchantUserId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This email belongs to the merchant owner.",
    });
  }

  if (
    input.systemRole === "MERCHANT_OWNER" &&
    existingOnMerchant?.systemRole === "MERCHANT_USER"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This email is already a merchant user on this account.",
    });
  }

  if (input.systemRole === "MERCHANT_OWNER" && !input.merchantUserId) {
    const otherOwner = await db.merchantUser.findFirst({
      where: {
        merchantId: input.merchantId,
        systemRole: "MERCHANT_OWNER",
        email: { not: email },
      },
    });
    if (otherOwner) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This merchant already has an owner.",
      });
    }
  }

  const operatorOnAccount = await db.accountUser.findFirst({
    where: { accountId: input.accountId, email },
  });
  if (operatorOnAccount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "This email is registered as an operator. Use a different email for the merchant portal.",
    });
  }

  const existingAuthUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingAuthUser) {
    const otherOperator = await db.accountUser.findFirst({
      where: { betterAuthUserId: existingAuthUser.id },
    });
    if (otherOperator) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "This email is registered as an operator. Use a different email for the merchant portal.",
      });
    }

    const otherMerchant = await db.merchantUser.findFirst({
      where: {
        betterAuthUserId: existingAuthUser.id,
        merchantId: { not: input.merchantId },
      },
    });
    if (otherMerchant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "This email is already linked to another merchant. Use a different email.",
      });
    }
  }

  const temporaryPassword = generateTemporaryPassword();
  const authUser = await upsertCredentialAuthUser({
    email,
    name: displayName,
    password: temporaryPassword,
  });

  const hadLinkedUser =
    existingOnMerchant?.betterAuthUserId != null ||
    (input.merchantUserId
      ? (
          await db.merchantUser.findUnique({
            where: { id: input.merchantUserId },
            select: { betterAuthUserId: true },
          })
        )?.betterAuthUserId != null
      : false);

  let merchantUserId: string;

  if (input.merchantUserId) {
    const updated = await db.merchantUser.update({
      where: { id: input.merchantUserId },
      data: {
        betterAuthUserId: authUser.id,
        email,
        firstName,
        lastName,
        systemRole: input.systemRole,
        permissions:
          input.systemRole === "MERCHANT_OWNER" ? [] : input.permissions,
        invitedBy: input.invitedBy,
      },
    });
    merchantUserId = updated.id;
  } else if (existingOnMerchant) {
    const updated = await db.merchantUser.update({
      where: { id: existingOnMerchant.id },
      data: {
        betterAuthUserId: authUser.id,
        firstName,
        lastName,
        systemRole: input.systemRole,
        permissions:
          input.systemRole === "MERCHANT_OWNER" ? [] : input.permissions,
        invitedBy: input.invitedBy,
      },
    });
    merchantUserId = updated.id;
  } else {
    const created = await db.merchantUser.create({
      data: {
        accountId: input.accountId,
        merchantId: input.merchantId,
        betterAuthUserId: authUser.id,
        systemRole: input.systemRole,
        permissions:
          input.systemRole === "MERCHANT_OWNER" ? [] : input.permissions,
        email,
        firstName,
        lastName,
        invitedBy: input.invitedBy,
      },
    });
    merchantUserId = created.id;
  }

  if (hadLinkedUser || existingOnMerchant?.betterAuthUserId) {
    await revokeBetterAuthSessions(authUser.id);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";

  const roleLabel =
    input.systemRole === "MERCHANT_OWNER" ? "Merchant Owner" : "Merchant User";

  await sendMerchantTeamInviteEmail({
    to: email,
    merchantName: merchant.name,
    roleLabel,
    permissionLabels:
      input.systemRole === "MERCHANT_OWNER"
        ? []
        : permissionLabels(input.permissions),
    signInUrl: `${baseUrl}/sign-in`,
    resetPasswordUrl: `${baseUrl}/forgot-password`,
    email,
    temporaryPassword,
  });

  return { merchantUserId };
}

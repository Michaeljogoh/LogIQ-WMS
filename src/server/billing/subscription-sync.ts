import type { Plan } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { planForPolarProductId } from "@/server/billing/polar-config";

type PolarSubscriptionPayload = {
  productId: string;
  customerId: string;
  metadata: Record<string, string | number | boolean | null | undefined>;
  customer: { externalId?: string | null };
};

function metadataAccountId(
  metadata: PolarSubscriptionPayload["metadata"],
): string | undefined {
  const raw = metadata.accountId;
  if (typeof raw === "string") {
    return raw;
  }
  if (typeof raw === "number") {
    return String(raw);
  }
  return undefined;
}

function resolveLogiqAccountId(sub: PolarSubscriptionPayload): string | null {
  return metadataAccountId(sub.metadata) ?? sub.customer.externalId ?? null;
}

export async function applyPolarSubscriptionToAccount(
  sub: PolarSubscriptionPayload,
) {
  const accountId = resolveLogiqAccountId(sub);
  if (!accountId) {
    return;
  }
  const plan = planForPolarProductId(sub.productId);
  if (!plan) {
    return;
  }
  await db.logiqAccount.update({
    where: { id: accountId },
    data: {
      plan,
      polarCustomerId: sub.customerId,
    },
  });
}

export async function applyPolarSubscriptionCancelled(
  sub: PolarSubscriptionPayload,
) {
  const accountId = resolveLogiqAccountId(sub);
  if (!accountId) {
    return;
  }
  await db.logiqAccount.update({
    where: { id: accountId },
    data: { plan: "STARTER" satisfies Plan },
  });
}

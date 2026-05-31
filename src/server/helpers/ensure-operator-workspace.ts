import { db } from "@/lib/db";
import {
  buildSessionTenantFields,
  type SessionTenantFields,
} from "@/server/helpers/session-enrichment";
import { syncAccountUserForMember } from "@/server/helpers/tenant-sync";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function uniqueOrganizationSlug(base: string): Promise<string> {
  const normalized = slugify(base) || "workspace";
  let candidate = normalized;
  let attempt = 0;

  while (attempt < 20) {
    const existing = await db.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    attempt += 1;
    candidate = `${normalized}-${attempt}`;
  }

  return `${normalized}-${Date.now().toString(36)}`;
}

/**
 * Creates a default 3PL org + account for operator sign-ups that skipped org creation.
 * Returns null when the user should remain unlinked (e.g. pending merchant invite).
 */
export async function ensureOperatorWorkspaceForUser(
  betterAuthUserId: string,
): Promise<SessionTenantFields | null> {
  const existing = await buildSessionTenantFields(betterAuthUserId);
  if (existing) {
    return existing;
  }

  const existingOperator = await db.accountUser.findUnique({
    where: { betterAuthUserId },
    select: { id: true, isActive: true, systemRole: true },
  });
  if (existingOperator) {
    if (!existingOperator.isActive && existingOperator.systemRole !== "PLATFORM_ADMIN") {
      return null;
    }
    return buildSessionTenantFields(betterAuthUserId);
  }

  const user = await db.user.findUnique({
    where: { id: betterAuthUserId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    return null;
  }

  const pendingMerchantInvite = await db.merchantUser.findFirst({
    where: {
      email: { equals: user.email, mode: "insensitive" },
      betterAuthUserId: null,
    },
    select: { id: true },
  });
  if (pendingMerchantInvite) {
    return null;
  }

  const existingMember = await db.member.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });

  if (existingMember) {
    await syncAccountUserForMember(
      {
        id: existingMember.organization.id,
        name: existingMember.organization.name,
        slug: existingMember.organization.slug,
      },
      { role: existingMember.role },
      { id: user.id, email: user.email, name: user.name },
    );
    return buildSessionTenantFields(betterAuthUserId);
  }

  const orgName =
    user.name?.trim() ||
    user.email.split("@")[0]?.replace(/\./g, " ") ||
    "My workspace";
  const slug = await uniqueOrganizationSlug(orgName);

  const organization = await db.organization.create({
    data: {
      name: orgName,
      slug,
      members: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  await syncAccountUserForMember(
    { id: organization.id, name: organization.name, slug: organization.slug },
    { role: "owner" },
    { id: user.id, email: user.email, name: user.name },
  );

  await db.session.updateMany({
    where: { userId: user.id },
    data: { activeOrganizationId: organization.id },
  });

  return buildSessionTenantFields(betterAuthUserId);
}

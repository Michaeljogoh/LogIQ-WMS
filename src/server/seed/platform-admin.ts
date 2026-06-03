import { db } from "@/lib/db";
import { PLATFORM_INTERNAL_ACCOUNT_SLUG } from "@/lib/system-roles";
import { upsertCredentialAuthUser } from "@/server/helpers/auth-credential-user";

let seedPromise: Promise<void> | null = null;

/**
 * Ensures the internal platform account and PLATFORM_ADMIN user exist.
 * Idempotent — safe to run on every server start.
 */
export async function ensurePlatformAdminSeed(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = runSeed().catch((error) => {
    seedPromise = null;
    throw error;
  });

  return seedPromise;
}

async function runSeed(): Promise<void> {
  const email = (process.env.PLATFORM_ADMIN_EMAIL ?? "admin@logiq.internal")
    .trim()
    .toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const name = process.env.PLATFORM_ADMIN_NAME ?? "LogIQ Platform Admin";

  if (!password?.trim()) {
    console.warn(
      "[platform-seed] Skipped: set PLATFORM_ADMIN_PASSWORD in .env to create the platform admin user.",
    );
    return;
  }

  const existingAdmin = await db.accountUser.findFirst({
    where: { systemRole: "PLATFORM_ADMIN" },
    select: { id: true },
  });

  if (existingAdmin) {
    return;
  }

  let platformAccount = await db.logiqAccount.findUnique({
    where: { slug: PLATFORM_INTERNAL_ACCOUNT_SLUG },
  });

  if (!platformAccount) {
    const orgId = `platform-${PLATFORM_INTERNAL_ACCOUNT_SLUG}`;
    platformAccount = await db.logiqAccount.create({
      data: {
        betterAuthOrgId: orgId,
        name: "LogIQ Platform (Internal)",
        slug: PLATFORM_INTERNAL_ACCOUNT_SLUG,
        plan: "ENTERPRISE",
      },
    });
  }

  const authUser = await upsertCredentialAuthUser({
    email,
    name,
    password: password.trim(),
  });

  await db.accountUser.upsert({
    where: { betterAuthUserId: authUser.id },
    create: {
      accountId: platformAccount.id,
      betterAuthUserId: authUser.id,
      systemRole: "PLATFORM_ADMIN",
      email,
      firstName: "LogIQ",
      lastName: "Platform",
    },
    update: {
      accountId: platformAccount.id,
      systemRole: "PLATFORM_ADMIN",
      email,
      firstName: "LogIQ",
      lastName: "Platform",
    },
  });

  console.info(
    `[platform-seed] Platform admin ready. Sign in at /sign-in → /platform/dashboard`,
  );
}

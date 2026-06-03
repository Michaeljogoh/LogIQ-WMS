import "dotenv/config";
import { createSeedClient } from "./db";
import {
  DEMO_MANAGER_EMAIL,
  DEMO_MERCHANT_OWNER_EMAIL,
  DEMO_MERCHANT_USER_EMAIL,
  DEMO_OWNER_EMAIL,
  DEMO_SLUG,
  DEMO_STAFF1_EMAIL,
  DEMO_STAFF2_EMAIL,
} from "./types";

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "[demo-seed:reset] Refusing to run in production. Set ALLOW_DEMO_SEED=true to override.",
    );
  }

  const db = createSeedClient();

  try {
    const account = await db.logiqAccount.findUnique({
      where: { slug: DEMO_SLUG },
      select: { id: true, betterAuthOrgId: true },
    });

    if (!account) {
      console.log("[demo-seed:reset] No demo tenant found. Nothing to reset.");
      return;
    }

    console.log(
      `[demo-seed:reset] Deleting demo tenant (id: ${account.id})...`,
    );

    // Deleting LogiqAccount cascades all related records
    await db.logiqAccount.delete({ where: { slug: DEMO_SLUG } });

    // Remove better-auth organization (cascades Member records)
    await db.organization.deleteMany({
      where: { id: account.betterAuthOrgId },
    });

    // Remove demo users (cascades Account/credential rows and Sessions)
    const demoEmails = [
      DEMO_OWNER_EMAIL,
      DEMO_MANAGER_EMAIL,
      DEMO_STAFF1_EMAIL,
      DEMO_STAFF2_EMAIL,
      DEMO_MERCHANT_OWNER_EMAIL,
      DEMO_MERCHANT_USER_EMAIL,
    ];
    await db.user.deleteMany({
      where: { email: { in: demoEmails } },
    });

    console.log("[demo-seed:reset] Done. Run pnpm db:seed:demo to re-seed.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("[demo-seed:reset] Fatal error:", err);
  process.exit(1);
});

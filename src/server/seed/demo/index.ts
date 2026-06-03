import "dotenv/config";
import { createSeedClient } from "./db";
import { seedAuth } from "./phases/00-auth";
import { seedAccount } from "./phases/01-account";
import { seedWarehouses } from "./phases/02-warehouses";
import { seedMerchants } from "./phases/03-merchants";
import { seedProducts } from "./phases/04-products";
import { seedSuppliers } from "./phases/05-suppliers";
import { seedStock } from "./phases/06-stock";
import { seedInbound } from "./phases/07-inbound";
import { seedOrders } from "./phases/08-orders";
import { seedFulfillment } from "./phases/09-fulfillment";
import { seedBilling } from "./phases/10-billing";
import { seedCycleCounts } from "./phases/11-cycle-counts";
import { seedTransfers } from "./phases/12-transfers";
import { seedLabels } from "./phases/13-labels";
import { seedIntegrations } from "./phases/14-integrations";
import { seedNotifications } from "./phases/15-notifications";
import { seedRouting } from "./phases/16-routing";
import { seedInsights } from "./phases/17-insights";
import { seedMerchantPortal } from "./phases/18-merchant-portal";
import { DEMO_SLUG } from "./types";

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "[demo-seed] Refusing to run in production. Set ALLOW_DEMO_SEED=true to override.",
    );
  }

  const db = createSeedClient();

  try {
    const existing = await db.logiqAccount.findUnique({
      where: { slug: DEMO_SLUG },
      select: { id: true },
    });

    if (existing) {
      console.log(
        `[demo-seed] Demo tenant already exists (id: ${existing.id}). Run pnpm db:seed:reset first to re-seed.`,
      );
      return;
    }

    console.log("[demo-seed] Starting demo seed...\n");

    let ctx = await seedAuth(db);
    console.log("  ✓ 00 auth");

    ctx = await seedAccount(db, ctx);
    console.log("  ✓ 01 account");

    ctx = await seedWarehouses(db, ctx);
    console.log("  ✓ 02 warehouses");

    ctx = await seedMerchants(db, ctx);
    console.log("  ✓ 03 merchants");

    ctx = await seedProducts(db, ctx);
    console.log("  ✓ 04 products");

    ctx = await seedSuppliers(db, ctx);
    console.log("  ✓ 05 suppliers");

    ctx = await seedStock(db, ctx);
    console.log("  ✓ 06 stock");

    ctx = await seedInbound(db, ctx);
    console.log("  ✓ 07 inbound");

    ctx = await seedOrders(db, ctx);
    console.log("  ✓ 08 orders");

    ctx = await seedFulfillment(db, ctx);
    console.log("  ✓ 09 fulfillment");

    ctx = await seedBilling(db, ctx);
    console.log("  ✓ 10 billing");

    ctx = await seedCycleCounts(db, ctx);
    console.log("  ✓ 11 cycle counts");

    ctx = await seedTransfers(db, ctx);
    console.log("  ✓ 12 transfers");

    ctx = await seedLabels(db, ctx);
    console.log("  ✓ 13 labels");

    ctx = await seedIntegrations(db, ctx);
    console.log("  ✓ 14 integrations");

    ctx = await seedNotifications(db, ctx);
    console.log("  ✓ 15 notifications");

    ctx = await seedRouting(db, ctx);
    console.log("  ✓ 16 routing");

    ctx = await seedInsights(db, ctx);
    console.log("  ✓ 17 insights");

    ctx = await seedMerchantPortal(db, ctx);
    console.log("  ✓ 18 merchant portal");

    console.log(`
[demo-seed] Done!

Sign in credentials:
  Operator (owner):     demo@logiq.internal           / Demo123!
  Warehouse Manager:    manager@demo.logiq            / Demo123!
  Warehouse Staff:      staff1@demo.logiq             / Demo123!
  Merchant (Apex owner): merchant@apexsportswear.demo / Demo123!
  Merchant (Apex user):  user@apexsportswear.demo    / Demo123!
`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("[demo-seed] Fatal error:", err);
  process.exit(1);
});

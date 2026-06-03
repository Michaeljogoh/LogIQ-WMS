import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../../../generated/prisma/client";
import type { SeedContext } from "../types";
import {
  DEMO_MANAGER_EMAIL,
  DEMO_MERCHANT_OWNER_EMAIL,
  DEMO_MERCHANT_USER_EMAIL,
  DEMO_OWNER_EMAIL,
  DEMO_PASSWORD,
  DEMO_STAFF1_EMAIL,
  DEMO_STAFF2_EMAIL,
} from "../types";

async function createAuthUser(
  db: PrismaClient,
  email: string,
  name: string,
  password: string,
) {
  const hash = await hashPassword(password);
  const user = await db.user.create({
    data: { email, name, emailVerified: true },
  });
  await db.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hash,
    },
  });
  return user;
}

export async function seedAuth(db: PrismaClient): Promise<SeedContext> {
  const [owner, manager, staff1, staff2, merchantOwner, merchantUser] =
    await Promise.all([
      createAuthUser(db, DEMO_OWNER_EMAIL, "Demo Operator", DEMO_PASSWORD),
      createAuthUser(db, DEMO_MANAGER_EMAIL, "Sam Manager", DEMO_PASSWORD),
      createAuthUser(db, DEMO_STAFF1_EMAIL, "Jake Wilson", DEMO_PASSWORD),
      createAuthUser(db, DEMO_STAFF2_EMAIL, "Amy Chen", DEMO_PASSWORD),
      createAuthUser(
        db,
        DEMO_MERCHANT_OWNER_EMAIL,
        "Alex Rivera",
        DEMO_PASSWORD,
      ),
      createAuthUser(db, DEMO_MERCHANT_USER_EMAIL, "Jordan Lee", DEMO_PASSWORD),
    ]);

  const org = await db.organization.create({
    data: {
      name: "Demo 3PL Co",
      slug: "demo-3pl-org",
      members: {
        createMany: {
          data: [
            { userId: owner.id, role: "owner" },
            { userId: manager.id, role: "admin" },
            { userId: staff1.id, role: "member" },
            { userId: staff2.id, role: "member" },
          ],
        },
      },
    },
  });

  return {
    orgId: org.id,
    ownerAuthUserId: owner.id,
    managerAuthUserId: manager.id,
    staff1AuthUserId: staff1.id,
    staff2AuthUserId: staff2.id,
    merchantOwnerAuthUserId: merchantOwner.id,
    merchantUserAuthUserId: merchantUser.id,
    // filled by subsequent phases
    accountId: "",
    ownerAccountUserId: "",
    managerAccountUserId: "",
    staff1AccountUserId: "",
    staff2AccountUserId: "",
    laxId: "",
    ordId: "",
    laxBins: [],
    ordBins: [],
    apexId: "",
    novatechId: "",
    lumiereId: "",
    apexContractId: "",
    novatechContractId: "",
    lumiereContractId: "",
    apexProductIds: [],
    novatechProductIds: [],
    lumiereProductIds: [],
    packagingTypeIds: [],
    apexSupplierIds: [],
    novatechSupplierIds: [],
    lumiereSupplierIds: [],
    orderIds: [],
    fulfilledOrderIds: [],
    unfulfilledOrderIds: [],
    shipmentIds: [],
    invoiceIds: [],
    labelTemplateIds: [],
    integrationIds: [],
  };
}

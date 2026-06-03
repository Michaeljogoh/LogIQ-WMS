import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

export function createSeedClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("[demo-seed] DATABASE_URL is not set");
  }
  const adapter = new PrismaPg(url);
  return new PrismaClient({ adapter });
}

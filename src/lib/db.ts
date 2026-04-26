/**
 * Canonical database accessor for new code paths.
 * Delegates to the Prisma singleton in `./prisma`.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export const db: PrismaClient = prisma;
export { prisma };

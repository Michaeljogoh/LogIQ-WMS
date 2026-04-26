/**
 * Canonical database accessor for new code paths.
 * Delegates to the Prisma singleton in `./prisma`.
 */
import { prisma } from "./prisma";

export const db = prisma;
export { prisma };

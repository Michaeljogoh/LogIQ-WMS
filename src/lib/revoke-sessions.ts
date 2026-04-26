import { db } from "@/lib/db";

export async function revokeBetterAuthSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

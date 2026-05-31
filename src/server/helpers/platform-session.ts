import { getActivePlatformSupportSession } from "@/server/helpers/platform-support-session";

export async function getPlatformActiveAccount(): Promise<{
  id: string;
  name: string;
  supportLevel: "READ_ONLY" | "EMERGENCY_IMPERSONATION";
  sessionId: string;
  expiresAt: Date;
  reason: string;
} | null> {
  const session = await getActivePlatformSupportSession();
  if (!session) {
    return null;
  }

  return {
    id: session.accountId,
    name: session.accountName,
    supportLevel: session.level,
    sessionId: session.id,
    expiresAt: session.expiresAt,
    reason: session.reason,
  };
}

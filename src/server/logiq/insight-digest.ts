import { subHours } from "date-fns";
import { db } from "@/lib/db";
import { sendLogiqInsightDigestEmail } from "@/lib/email";

export async function runInsightDigestForAccount(
  accountId: string,
): Promise<void> {
  const since = subHours(new Date(), 24);
  const insights = await db.logIQInsight.findMany({
    where: {
      accountId,
      acknowledgedAt: null,
      severity: { in: ["WARNING", "CRITICAL"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (insights.length === 0) {
    return;
  }

  const owners = await db.accountUser.findMany({
    where: {
      accountId,
      systemRole: "THREEPL_ACCOUNT_OWNER",
    },
    select: { email: true, firstName: true },
  });

  const account = await db.logiqAccount.findFirst({
    where: { id: accountId },
    select: { name: true },
  });

  for (const owner of owners) {
    await sendLogiqInsightDigestEmail({
      to: owner.email,
      accountName: account?.name ?? "LogIQ",
      insights: insights.map((i: (typeof insights)[number]) => ({
        severity: i.severity,
        title: i.title,
        body: i.body,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  }
}

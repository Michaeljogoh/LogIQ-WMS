import { subDays } from "date-fns";
import { db } from "@/lib/db";

function avgDurationMs(
  rows: { startedAt: Date | null; completedAt: Date | null }[],
): number | null {
  const durations = rows
    .filter((r): r is typeof r & { startedAt: Date; completedAt: Date } =>
      Boolean(r.startedAt && r.completedAt),
    )
    .map((r) => r.completedAt.getTime() - r.startedAt.getTime())
    .filter((ms) => ms > 0);
  if (durations.length === 0) {
    return null;
  }
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

export async function runPickRateScanForAccount(
  accountId: string,
): Promise<void> {
  const now = new Date();
  const recentStart = subDays(now, 7);
  const prevStart = subDays(now, 14);
  const prevEnd = subDays(now, 7);

  const warehouses = await db.warehouse.findMany({
    where: { accountId, isActive: true },
    select: { id: true, name: true, code: true },
  });

  for (const w of warehouses) {
    const [recent, prev] = await Promise.all([
      db.pickList.findMany({
        where: {
          accountId,
          warehouseId: w.id,
          status: "COMPLETED",
          startedAt: { not: null },
          completedAt: { gte: recentStart },
        },
        select: { startedAt: true, completedAt: true },
      }),
      db.pickList.findMany({
        where: {
          accountId,
          warehouseId: w.id,
          status: "COMPLETED",
          startedAt: { not: null },
          completedAt: { gte: prevStart, lt: prevEnd },
        },
        select: { startedAt: true, completedAt: true },
      }),
    ]);

    const recentAvg = avgDurationMs(recent);
    const prevAvg = avgDurationMs(prev);
    if (
      recentAvg === null ||
      prevAvg === null ||
      prevAvg === 0 ||
      recent.length < 3 ||
      prev.length < 3
    ) {
      continue;
    }

    if (recentAvg <= prevAvg * 1.3) {
      continue;
    }

    const dedupeKey = `pickrate:${w.id}`;
    const existing = await db.logIQInsight.findFirst({
      where: { accountId, dedupeKey, acknowledgedAt: null },
    });
    const body = `Average pick list cycle time in ${w.name} rose ~${((recentAvg / prevAvg - 1) * 100).toFixed(0)}% vs the prior week.`;
    if (existing) {
      await db.logIQInsight.update({
        where: { id: existing.id },
        data: {
          title: "Pick rate slowdown",
          body,
          severity: "WARNING",
          warehouseId: w.id,
          data: {
            warehouseId: w.id,
            recentAvgMs: recentAvg,
            prevAvgMs: prevAvg,
          },
        },
      });
    } else {
      await db.logIQInsight.create({
        data: {
          accountId,
          warehouseId: w.id,
          type: "PICK_RATE_DROP",
          severity: "WARNING",
          title: "Pick rate slowdown",
          body,
          dedupeKey,
          data: {
            warehouseId: w.id,
            recentAvgMs: recentAvg,
            prevAvgMs: prevAvg,
          },
          actionUrl: `/orders`,
        },
      });
    }
  }
}

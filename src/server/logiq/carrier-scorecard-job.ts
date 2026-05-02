import { db } from "@/lib/db";

function weightTierFromOz(oz: number): string {
  if (oz < 16) {
    return "0-1lb";
  }
  if (oz < 80) {
    return "1-5lb";
  }
  if (oz < 240) {
    return "5-15lb";
  }
  return "15lb+";
}

export async function runCarrierScorecardForAccount(
  accountId: string,
): Promise<void> {
  const logs = await db.carrierPerformanceLog.findMany({
    where: { accountId },
    select: {
      carrier: true,
      service: true,
      destinationZone: true,
      weightOz: true,
      onTime: true,
      damaged: true,
      rateCents: true,
      actualDays: true,
    },
  });

  type Key = string;
  const groups = new Map<
    Key,
    {
      carrier: string;
      service: string;
      destinationZone: number | null;
      weightTier: string | null;
      onTimeVals: number[];
      damageVals: number[];
      costs: number[];
      actualDays: number[];
    }
  >();

  for (const row of logs) {
    const tier = weightTierFromOz(row.weightOz);
    const key = [
      row.carrier,
      row.service,
      row.destinationZone ?? "null",
      tier,
    ].join("|");
    let g = groups.get(key);
    if (!g) {
      g = {
        carrier: row.carrier,
        service: row.service,
        destinationZone: row.destinationZone,
        weightTier: tier,
        onTimeVals: [],
        damageVals: [],
        costs: [],
        actualDays: [],
      };
      groups.set(key, g);
    }
    if (row.onTime !== null) {
      g.onTimeVals.push(row.onTime ? 1 : 0);
    }
    g.damageVals.push(row.damaged ? 1 : 0);
    g.costs.push(row.rateCents);
    if (row.actualDays !== null) {
      g.actualDays.push(row.actualDays);
    }
  }

  const allCosts = logs.map((l) => l.rateCents);
  const minCost = allCosts.length ? Math.min(...allCosts) : 0;
  const maxCost = allCosts.length ? Math.max(...allCosts) : 0;

  for (const g of groups.values()) {
    const onTimeRate =
      g.onTimeVals.length > 0
        ? g.onTimeVals.reduce((a, b) => a + b, 0) / g.onTimeVals.length
        : 0;
    const damageRate =
      g.damageVals.length > 0
        ? g.damageVals.reduce((a, b) => a + b, 0) / g.damageVals.length
        : 0;
    const avgCostCents =
      g.costs.length > 0
        ? Math.round(g.costs.reduce((a, b) => a + b, 0) / g.costs.length)
        : 0;
    const avgActualDays =
      g.actualDays.length > 0
        ? g.actualDays.reduce((a, b) => a + b, 0) / g.actualDays.length
        : 0;

    const costEfficiency =
      maxCost === minCost ? 1 : (maxCost - avgCostCents) / (maxCost - minCost);

    const score =
      onTimeRate * 0.5 +
      (1 - damageRate) * 0.3 +
      Math.max(0, Math.min(1, costEfficiency)) * 0.2;

    const existing = await db.carrierScorecard.findFirst({
      where: {
        accountId,
        carrier: g.carrier,
        service: g.service,
        weightTier: g.weightTier,
        destinationZone: g.destinationZone,
      },
    });
    const payload = {
      onTimeRate,
      damageRate,
      avgCostCents,
      avgActualDays,
      score,
    };
    if (existing) {
      await db.carrierScorecard.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await db.carrierScorecard.create({
        data: {
          accountId,
          carrier: g.carrier,
          service: g.service,
          destinationZone: g.destinationZone,
          weightTier: g.weightTier,
          ...payload,
        },
      });
    }
  }
}

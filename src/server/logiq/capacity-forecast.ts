import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { getCache, setCache } from "@/server/cache/analytics-cache";
import {
  CAPACITY_CACHE_TTL_SECONDS,
  capacityCacheKey,
  ORDERS_PER_STAFF_PER_SHIFT,
} from "@/server/logiq/constants";

export type CapacityForecastDay = {
  date: string;
  predicted: number;
  low: number;
  high: number;
  recommendedStaff: number;
};

export type CapacityForecastPayload = {
  warehouseId: string;
  warehouseName: string;
  historicalPeak: number;
  generatedAt: string;
  days: CapacityForecastDay[];
};

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdSample(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const m = mean(values);
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

/**
 * Exponential smoothing + day-of-week seasonality (alpha = 0.3).
 */
export async function computeCapacityForecastForWarehouse(args: {
  accountId: string;
  warehouseId: string;
}): Promise<CapacityForecastPayload> {
  const since = subDays(new Date(), 90);
  const orders = await db.order.findMany({
    where: {
      accountId: args.accountId,
      warehouseId: args.warehouseId,
      createdAt: { gte: since },
      status: { not: "CANCELLED" },
    },
    select: { createdAt: true },
  });

  const byDay = new Map<string, number>();
  for (const o of orders) {
    const k = o.createdAt.toISOString().slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }

  const series = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  const counts = series.map(([, c]) => c);
  const historicalPeak = counts.length ? Math.max(...counts) : 0;

  const dowBuckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const [day, c] of series) {
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    dowBuckets[dow].push(c);
  }
  const dowAvg = dowBuckets.map((bucket) =>
    bucket.length ? mean(bucket) : mean(counts) || 1,
  );
  const overallMean = mean(counts) || 1;
  const seasonal = dowAvg.map((v) => (overallMean > 0 ? v / overallMean : 1));

  const deseasonalized = series.map(([day, c]) => {
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    const idx = seasonal[dow] || 1;
    return c / idx;
  });

  const alpha = 0.3;
  let level = deseasonalized[0] ?? 0;
  for (const v of deseasonalized.slice(1)) {
    level = alpha * v + (1 - alpha) * level;
  }

  const se = stdSample(counts.slice(-14)) || 0.5;

  const days: CapacityForecastDay[] = [];
  const start = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dow = d.getUTCDay();
    const predicted = Math.max(0, level * (seasonal[dow] ?? 1));
    const band = 1.96 * se;
    days.push({
      date: d.toISOString().slice(0, 10),
      predicted: Math.round(predicted * 10) / 10,
      low: Math.max(0, Math.round((predicted - band) * 10) / 10),
      high: Math.max(0, Math.round((predicted + band) * 10) / 10),
      recommendedStaff: Math.max(
        1,
        Math.ceil(predicted / ORDERS_PER_STAFF_PER_SHIFT),
      ),
    });
  }

  const wh = await db.warehouse.findFirst({
    where: { id: args.warehouseId, accountId: args.accountId },
    select: { name: true },
  });

  return {
    warehouseId: args.warehouseId,
    warehouseName: wh?.name ?? args.warehouseId,
    historicalPeak,
    generatedAt: new Date().toISOString(),
    days,
  };
}

export async function runCapacityForecastForAccount(
  accountId: string,
): Promise<void> {
  const warehouses = await db.warehouse.findMany({
    where: { accountId, isActive: true },
    select: { id: true },
  });

  for (const w of warehouses) {
    const payload = await computeCapacityForecastForWarehouse({
      accountId,
      warehouseId: w.id,
    });
    await setCache(
      capacityCacheKey(accountId, w.id),
      payload,
      CAPACITY_CACHE_TTL_SECONDS,
    );

    const breach = payload.days.some(
      (d) => d.predicted > payload.historicalPeak * 0.9,
    );
    if (breach && payload.historicalPeak > 0) {
      const dedupeKey = `capacity:${w.id}:${payload.generatedAt.slice(0, 10)}`;
      const exists = await db.logIQInsight.findFirst({
        where: {
          accountId,
          dedupeKey,
          acknowledgedAt: null,
        },
      });
      if (!exists) {
        await db.logIQInsight.create({
          data: {
            accountId,
            warehouseId: w.id,
            type: "CAPACITY_WARNING",
            severity: "WARNING",
            title: "Fulfillment capacity risk",
            body: `Forecasted volume may exceed 90% of the recent historical peak for this warehouse.`,
            dedupeKey,
            data: {
              warehouseId: w.id,
              historicalPeak: payload.historicalPeak,
            },
            actionUrl: `/logiq`,
          },
        });
      }
    }
  }
}

export async function readCapacityForecastFromCache(
  accountId: string,
  warehouseId: string,
): Promise<CapacityForecastPayload | null> {
  return getCache<CapacityForecastPayload>(
    capacityCacheKey(accountId, warehouseId),
  );
}

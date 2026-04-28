import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { getOrSetCache } from "@/server/cache/analytics-cache";

const ORDERS_PER_STAFF_PER_SHIFT = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

const dateRangeInput = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function toIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: Date, to: Date) {
  const list: Date[] = [];
  let cursor = startOfUtcDay(from).getTime();
  const end = endOfUtcDay(to).getTime();
  while (cursor <= end) {
    list.push(new Date(cursor));
    cursor += DAY_MS;
  }
  return list;
}

function createCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) {
    return "No rows";
  }
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escape(row[header] ?? "")).join(","),
    ),
  ];
  return lines.join("\n");
}

async function createPdfReport(args: {
  title: string;
  rows: Array<Record<string, string | number>>;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 760;
  page.drawText(args.title, { x: 40, y, size: 16, font });
  y -= 26;

  const headers = args.rows[0] ? Object.keys(args.rows[0]) : [];
  if (!headers.length) {
    page.drawText("No report rows found for selected filters.", {
      x: 40,
      y,
      size: 10,
      font,
    });
    return Buffer.from(await pdf.save()).toString("base64");
  }

  page.drawText(headers.join(" | "), { x: 40, y, size: 10, font });
  y -= 16;
  for (const row of args.rows.slice(0, 45)) {
    if (y < 40) {
      break;
    }
    page.drawText(headers.map((h) => String(row[h] ?? "")).join(" | "), {
      x: 40,
      y,
      size: 9,
      font,
    });
    y -= 14;
  }

  return Buffer.from(await pdf.save()).toString("base64");
}

function computeForecast(dailyCounts: number[]) {
  const alpha = 0.3;
  const safeCounts = dailyCounts.length ? dailyCounts : [0];
  const seasonalBuckets = Array.from({ length: 7 }, () => [] as number[]);
  for (let i = 0; i < safeCounts.length; i += 1) {
    seasonalBuckets[i % 7].push(safeCounts[i]);
  }

  const globalAvg =
    safeCounts.reduce((sum, value) => sum + value, 0) /
    Math.max(1, safeCounts.length);
  const seasonalIndices = seasonalBuckets.map((bucket) => {
    if (!bucket.length || globalAvg === 0) {
      return 1;
    }
    const avg = bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
    return avg / globalAvg;
  });

  const deseasonalized = safeCounts.map(
    (value, index) => value / (seasonalIndices[index % 7] || 1),
  );
  let level = deseasonalized[0] ?? 0;
  for (let i = 1; i < deseasonalized.length; i += 1) {
    level = alpha * deseasonalized[i] + (1 - alpha) * level;
  }

  const residuals = deseasonalized.map((value) => value - level);
  const variance =
    residuals.reduce((sum, value) => sum + value * value, 0) /
    Math.max(1, residuals.length);
  const stdError = Math.sqrt(variance);

  return {
    level,
    seasonalIndices,
    stdError,
  };
}

export const analyticsRouter = createTRPCRouter({
  operationsDashboard: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const now = new Date();
      const startToday = startOfUtcDay(now);
      const endToday = endOfUtcDay(now);
      const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);

      return getOrSetCache({
        key: `analytics:${accountId}:operations-dashboard`,
        ttlSeconds: 300,
        compute: async () => {
          const [ordersToday, pendingOrders, pickLists, slaOrders] =
            await ctx.db.$transaction([
              ctx.db.order.count({
                where: {
                  accountId,
                  createdAt: { gte: startToday, lte: endToday },
                },
              }),
              ctx.db.order.count({
                where: {
                  accountId,
                  status: "PENDING",
                  fulfillmentStatus: { not: "FULFILLED" },
                },
              }),
              ctx.db.pickList.findMany({
                where: {
                  accountId,
                  startedAt: { not: null },
                  completedAt: { not: null },
                  createdAt: { gte: sevenDaysAgo },
                },
                select: { startedAt: true, completedAt: true },
              }),
              ctx.db.order.findMany({
                where: {
                  accountId,
                  dueAt: { gte: sevenDaysAgo, lte: now },
                },
                select: { dueAt: true, fulfillmentStatus: true },
              }),
            ]);

          const fulfilledToday = await ctx.db.order.count({
            where: {
              accountId,
              createdAt: { gte: startToday, lte: endToday },
              fulfillmentStatus: "FULFILLED",
            },
          });

          const fulfillmentRatePct =
            ordersToday > 0
              ? Math.round((fulfilledToday / ordersToday) * 10000) / 100
              : 0;

          const avgPickTimeMins =
            pickLists.length > 0
              ? Math.round(
                  (pickLists.reduce((sum, item) => {
                    const start = item.startedAt?.getTime() ?? 0;
                    const end = item.completedAt?.getTime() ?? 0;
                    return sum + Math.max(0, (end - start) / 60000);
                  }, 0) /
                    pickLists.length) *
                    100,
                ) / 100
              : 0;

          const slaMet = slaOrders.filter((order) => {
            if (!order.dueAt) {
              return false;
            }
            return order.fulfillmentStatus === "FULFILLED" || order.dueAt > now;
          }).length;
          const slaCompliancePct7d =
            slaOrders.length > 0
              ? Math.round((slaMet / slaOrders.length) * 10000) / 100
              : 100;

          return {
            ordersToday,
            fulfillmentRatePct,
            avgPickTimeMins,
            slaCompliancePct7d,
            pendingOrders,
          };
        },
      });
    }),

  inventoryHealth: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return getOrSetCache({
        key: `analytics:${accountId}:inventory-health`,
        ttlSeconds: 900,
        compute: async () => {
          const [totalSkus, stockAggregate, products, movements30d] =
            await ctx.db.$transaction([
              ctx.db.product.count({ where: { accountId, isActive: true } }),
              ctx.db.stockLevel.aggregate({
                where: { accountId },
                _sum: { quantity: true },
              }),
              ctx.db.product.findMany({
                where: { accountId, isActive: true },
                include: {
                  stockLevels: { select: { quantity: true } },
                  movements: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { createdAt: true },
                  },
                },
              }),
              ctx.db.stockMovement.findMany({
                where: {
                  accountId,
                  createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) },
                },
                include: {
                  product: { select: { sku: true, name: true } },
                },
              }),
            ]);

          const totalUnits = stockAggregate._sum.quantity ?? 0;
          const inventoryValueCents = totalUnits * 100;

          let lowStockCount = 0;
          let deadStockCount = 0;
          for (const product of products) {
            const qty = product.stockLevels.reduce(
              (sum, level) => sum + level.quantity,
              0,
            );
            if (
              typeof product.lowStockThreshold === "number" &&
              qty < product.lowStockThreshold
            ) {
              lowStockCount += 1;
            }
            const lastMovementDate = product.movements[0]?.createdAt;
            const cutoff = new Date(
              Date.now() - product.deadStockDays * DAY_MS,
            );
            if (qty > 0 && (!lastMovementDate || lastMovementDate < cutoff)) {
              deadStockCount += 1;
            }
          }

          const movementBySku = new Map<
            string,
            { sku: string; name: string; movedUnits: number }
          >();
          for (const movement of movements30d) {
            const sku = movement.product.sku;
            const current = movementBySku.get(sku) ?? {
              sku,
              name: movement.product.name,
              movedUnits: 0,
            };
            current.movedUnits += Math.abs(movement.quantityDelta);
            movementBySku.set(sku, current);
          }

          const top10Movers = [...movementBySku.values()]
            .sort((a, b) => b.movedUnits - a.movedUnits)
            .slice(0, 10);

          return {
            totalSkus,
            totalUnits,
            inventoryValueCents,
            lowStockCount,
            deadStockCount,
            top10Movers,
          };
        },
      });
    }),

  merchantPerformance: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const from = input.from
        ? startOfUtcDay(input.from)
        : new Date(Date.now() - 30 * DAY_MS);
      const to = input.to ? endOfUtcDay(input.to) : new Date();
      const cacheKey = `analytics:${accountId}:merchant-performance:${toIsoDay(from)}:${toIsoDay(to)}`;

      return getOrSetCache({
        key: cacheKey,
        ttlSeconds: 900,
        compute: async () => {
          const [merchants, orders, invoices] = await ctx.db.$transaction([
            ctx.db.merchant.findMany({
              where: { accountId },
              select: { id: true, name: true },
            }),
            ctx.db.order.findMany({
              where: { accountId, createdAt: { gte: from, lte: to } },
              include: { lines: { select: { quantity: true } } },
            }),
            ctx.db.invoice.findMany({
              where: { accountId, createdAt: { gte: from, lte: to } },
              select: { merchantId: true, totalCents: true },
            }),
          ]);

          return merchants.map((merchant) => {
            const merchantOrders = orders.filter(
              (order) => order.merchantId === merchant.id,
            );
            const unitsShipped = merchantOrders.reduce(
              (sum, order) =>
                sum +
                order.lines.reduce(
                  (lineSum, line) => lineSum + line.quantity,
                  0,
                ),
              0,
            );
            const billedCents = invoices
              .filter((invoice) => invoice.merchantId === merchant.id)
              .reduce((sum, invoice) => sum + invoice.totalCents, 0);

            const withSla = merchantOrders.filter((order) => order.dueAt);
            const breaches = withSla.filter(
              (order) =>
                order.dueAt &&
                order.dueAt < new Date() &&
                order.fulfillmentStatus !== "FULFILLED",
            ).length;
            const slaMet = withSla.length - breaches;
            const slaPct = withSla.length
              ? Math.round((slaMet / withSla.length) * 10000) / 100
              : 100;

            return {
              merchantId: merchant.id,
              merchantName: merchant.name,
              orderCount: merchantOrders.length,
              unitsShipped,
              billedCents,
              slaPct,
              breachCount: breaches,
            };
          });
        },
      });
    }),

  carrierCost: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const from = input.from
        ? startOfUtcDay(input.from)
        : new Date(Date.now() - 30 * DAY_MS);
      const to = input.to ? endOfUtcDay(input.to) : new Date();
      const cacheKey = `analytics:${accountId}:carrier-cost:${toIsoDay(from)}:${toIsoDay(to)}`;

      return getOrSetCache({
        key: cacheKey,
        ttlSeconds: 1800,
        compute: async () => {
          const logs = await ctx.db.carrierPerformanceLog.findMany({
            where: { accountId, createdAt: { gte: from, lte: to } },
          });

          const byCarrier = new Map<
            string,
            {
              carrier: string;
              shipmentCount: number;
              totalCostCents: number;
              onTimeCount: number;
              damagedCount: number;
              timedCount: number;
            }
          >();
          for (const log of logs) {
            const key = `${log.carrier}:${log.service}`;
            const row = byCarrier.get(key) ?? {
              carrier: `${log.carrier} ${log.service}`,
              shipmentCount: 0,
              totalCostCents: 0,
              onTimeCount: 0,
              damagedCount: 0,
              timedCount: 0,
            };
            row.shipmentCount += 1;
            row.totalCostCents += log.rateCents;
            if (typeof log.onTime === "boolean") {
              row.timedCount += 1;
              if (log.onTime) {
                row.onTimeCount += 1;
              }
            }
            if (log.damaged) {
              row.damagedCount += 1;
            }
            byCarrier.set(key, row);
          }

          return [...byCarrier.values()].map((row) => ({
            carrier: row.carrier,
            shipmentCount: row.shipmentCount,
            totalCostCents: row.totalCostCents,
            avgCostCents:
              row.shipmentCount > 0
                ? Math.round(row.totalCostCents / row.shipmentCount)
                : 0,
            onTimeRatePct:
              row.timedCount > 0
                ? Math.round((row.onTimeCount / row.timedCount) * 10000) / 100
                : 0,
            damageRatePct:
              row.shipmentCount > 0
                ? Math.round((row.damagedCount / row.shipmentCount) * 10000) /
                  100
                : 0,
          }));
        },
      });
    }),

  receivingReport: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const from = input.from
        ? startOfUtcDay(input.from)
        : new Date(Date.now() - 30 * DAY_MS);
      const to = input.to ? endOfUtcDay(input.to) : new Date();

      const [records, purchaseOrders] = await ctx.db.$transaction([
        ctx.db.receivingRecord.findMany({
          where: { accountId, createdAt: { gte: from, lte: to } },
          include: {
            po: {
              select: {
                id: true,
                poNumber: true,
                expectedDate: true,
                receivedAt: true,
              },
            },
            product: { select: { sku: true, name: true } },
          },
        }),
        ctx.db.purchaseOrder.findMany({
          where: { accountId, createdAt: { gte: from, lte: to } },
          select: {
            id: true,
            poNumber: true,
            expectedDate: true,
            receivedAt: true,
            status: true,
          },
        }),
      ]);

      const totalUnitsReceived = records.reduce(
        (sum, record) => sum + record.receivedQty,
        0,
      );
      const uniquePoCount = new Set(records.map((record) => record.poId)).size;
      const onTimePos = purchaseOrders.filter((po) => {
        if (!po.expectedDate || !po.receivedAt) {
          return false;
        }
        return po.receivedAt <= po.expectedDate;
      }).length;
      const onTimeRatePct =
        purchaseOrders.length > 0
          ? Math.round((onTimePos / purchaseOrders.length) * 10000) / 100
          : 0;

      return {
        totalUnitsReceived,
        uniquePoCount,
        onTimeRatePct,
        rows: records.map((record) => ({
          id: record.id,
          poNumber: record.po.poNumber,
          sku: record.product.sku,
          productName: record.product.name,
          receivedQty: record.receivedQty,
          receivedAt: record.createdAt,
          discrepancyNote: record.discrepancyNote ?? "",
        })),
      };
    }),

  capacityForecast: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ warehouseId: z.string().cuid().optional() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const cacheKey = `analytics:${accountId}:capacity-forecast:${input.warehouseId ?? "all"}`;
      return getOrSetCache({
        key: cacheKey,
        ttlSeconds: 3600,
        compute: async () => {
          const start = startOfUtcDay(new Date(Date.now() - 89 * DAY_MS));
          const orders = await ctx.db.order.findMany({
            where: {
              accountId,
              createdAt: { gte: start },
              ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
            },
            select: { createdAt: true },
          });

          const dayMap = new Map<string, number>();
          for (const day of daysBetween(start, new Date())) {
            dayMap.set(toIsoDay(day), 0);
          }
          for (const order of orders) {
            const key = toIsoDay(order.createdAt);
            dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
          }
          const dailySeries = [...dayMap.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([, value]) => value);

          const forecast = computeForecast(dailySeries);
          const next7Days = daysBetween(
            startOfUtcDay(new Date(Date.now() + DAY_MS)),
            startOfUtcDay(new Date(Date.now() + 7 * DAY_MS)),
          );

          return next7Days.map((day, index) => {
            const dayOfWeek = day.getUTCDay();
            const predicted = Math.max(
              0,
              Math.round(
                forecast.level * (forecast.seasonalIndices[dayOfWeek] || 1),
              ),
            );
            const margin = 1.96 * forecast.stdError;
            const lower = Math.max(0, Math.round(predicted - margin));
            const upper = Math.max(predicted, Math.round(predicted + margin));
            return {
              date: toIsoDay(day),
              predictedOrders: predicted,
              lowerBound: lower,
              upperBound: upper,
              recommendedStaff: Math.max(
                1,
                Math.ceil(predicted / ORDERS_PER_STAFF_PER_SHIFT),
              ),
            };
          });
        },
      });
    }),

  customReport: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
        dimensions: z
          .array(z.enum(["DAY", "MERCHANT", "CARRIER", "WAREHOUSE"]))
          .min(1),
        metrics: z
          .array(
            z.enum([
              "ORDER_COUNT",
              "UNITS_SHIPPED",
              "BILLED_CENTS",
              "SHIPMENT_COST_CENTS",
              "RECEIVED_UNITS",
            ]),
          )
          .min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const from = startOfUtcDay(input.from);
      const to = endOfUtcDay(input.to);

      const [orders, invoices, receiving, shipments, merchants, warehouses] =
        await ctx.db.$transaction([
          ctx.db.order.findMany({
            where: { accountId, createdAt: { gte: from, lte: to } },
            include: { lines: { select: { quantity: true } } },
          }),
          ctx.db.invoice.findMany({
            where: { accountId, createdAt: { gte: from, lte: to } },
            select: { merchantId: true, totalCents: true, createdAt: true },
          }),
          ctx.db.receivingRecord.findMany({
            where: { accountId, createdAt: { gte: from, lte: to } },
            include: {
              po: { select: { warehouseId: true, merchantId: true } },
            },
          }),
          ctx.db.shipment.findMany({
            where: { accountId, createdAt: { gte: from, lte: to } },
            include: {
              order: { select: { merchantId: true, warehouseId: true } },
            },
          }),
          ctx.db.merchant.findMany({
            where: { accountId },
            select: { id: true, name: true },
          }),
          ctx.db.warehouse.findMany({
            where: { accountId },
            select: { id: true, code: true, name: true },
          }),
        ]);

      const merchantMap = new Map(merchants.map((m) => [m.id, m.name]));
      const warehouseMap = new Map(
        warehouses.map((w) => [w.id, `${w.code} - ${w.name}`]),
      );

      const keyFor = (args: {
        day?: string;
        merchantId?: string | null;
        carrier?: string;
        warehouseId?: string | null;
      }) => {
        const dims: Record<string, string> = {
          DAY: args.day ?? "-",
          MERCHANT: args.merchantId
            ? (merchantMap.get(args.merchantId) ?? args.merchantId)
            : "-",
          CARRIER: args.carrier ?? "-",
          WAREHOUSE: args.warehouseId
            ? (warehouseMap.get(args.warehouseId) ?? args.warehouseId)
            : "-",
        };
        return input.dimensions.map((d) => `${d}:${dims[d]}`).join("|");
      };

      const byGroup = new Map<string, Record<string, string | number>>();
      const ensure = (key: string, seed: Record<string, string | number>) => {
        const found = byGroup.get(key);
        if (found) {
          return found;
        }
        const created = { ...seed };
        byGroup.set(key, created);
        return created;
      };

      for (const order of orders) {
        const groupKey = keyFor({
          day: toIsoDay(order.createdAt),
          merchantId: order.merchantId,
          warehouseId: order.warehouseId,
        });
        const row = ensure(groupKey, {
          DAY: toIsoDay(order.createdAt),
          MERCHANT: merchantMap.get(order.merchantId) ?? order.merchantId,
          CARRIER: "-",
          WAREHOUSE: order.warehouseId
            ? (warehouseMap.get(order.warehouseId) ?? order.warehouseId)
            : "-",
          ORDER_COUNT: 0,
          UNITS_SHIPPED: 0,
          BILLED_CENTS: 0,
          SHIPMENT_COST_CENTS: 0,
          RECEIVED_UNITS: 0,
        });
        row.ORDER_COUNT = Number(row.ORDER_COUNT) + 1;
        row.UNITS_SHIPPED =
          Number(row.UNITS_SHIPPED) +
          order.lines.reduce((sum, line) => sum + line.quantity, 0);
      }

      for (const invoice of invoices) {
        const groupKey = keyFor({
          day: toIsoDay(invoice.createdAt),
          merchantId: invoice.merchantId,
        });
        const row = ensure(groupKey, {
          DAY: toIsoDay(invoice.createdAt),
          MERCHANT: merchantMap.get(invoice.merchantId) ?? invoice.merchantId,
          CARRIER: "-",
          WAREHOUSE: "-",
          ORDER_COUNT: 0,
          UNITS_SHIPPED: 0,
          BILLED_CENTS: 0,
          SHIPMENT_COST_CENTS: 0,
          RECEIVED_UNITS: 0,
        });
        row.BILLED_CENTS = Number(row.BILLED_CENTS) + invoice.totalCents;
      }

      for (const shipment of shipments) {
        const groupKey = keyFor({
          day: toIsoDay(shipment.createdAt),
          merchantId: shipment.order.merchantId,
          carrier: shipment.carrier,
          warehouseId: shipment.order.warehouseId,
        });
        const row = ensure(groupKey, {
          DAY: toIsoDay(shipment.createdAt),
          MERCHANT:
            merchantMap.get(shipment.order.merchantId) ??
            shipment.order.merchantId,
          CARRIER: shipment.carrier,
          WAREHOUSE: shipment.order.warehouseId
            ? (warehouseMap.get(shipment.order.warehouseId) ??
              shipment.order.warehouseId)
            : "-",
          ORDER_COUNT: 0,
          UNITS_SHIPPED: 0,
          BILLED_CENTS: 0,
          SHIPMENT_COST_CENTS: 0,
          RECEIVED_UNITS: 0,
        });
        row.SHIPMENT_COST_CENTS =
          Number(row.SHIPMENT_COST_CENTS) + (shipment.rateCents ?? 0);
      }

      for (const record of receiving) {
        const groupKey = keyFor({
          day: toIsoDay(record.createdAt),
          merchantId: record.po.merchantId,
          warehouseId: record.po.warehouseId,
        });
        const row = ensure(groupKey, {
          DAY: toIsoDay(record.createdAt),
          MERCHANT:
            merchantMap.get(record.po.merchantId) ?? record.po.merchantId,
          CARRIER: "-",
          WAREHOUSE:
            warehouseMap.get(record.po.warehouseId) ?? record.po.warehouseId,
          ORDER_COUNT: 0,
          UNITS_SHIPPED: 0,
          BILLED_CENTS: 0,
          SHIPMENT_COST_CENTS: 0,
          RECEIVED_UNITS: 0,
        });
        row.RECEIVED_UNITS = Number(row.RECEIVED_UNITS) + record.receivedQty;
      }

      const rows = [...byGroup.values()].map((row) => {
        const projected: Record<string, string | number> = {};
        for (const dimension of input.dimensions) {
          projected[dimension] = row[dimension];
        }
        for (const metric of input.metrics) {
          projected[metric] = row[metric];
        }
        return projected;
      });

      const chartType =
        input.dimensions.includes("DAY") && input.metrics.length === 1
          ? "line"
          : "bar";

      return { rows, chartType };
    }),

  customReportExport: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        title: z.string().min(1).max(80).default("Custom Report"),
        rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
      }),
    )
    .mutation(async ({ input }) => {
      const csv = createCsv(input.rows);
      const pdfBase64 = await createPdfReport({
        title: input.title,
        rows: input.rows,
      });
      return {
        csv,
        pdfBase64,
        csvFileName: `${input.title.toLowerCase().replaceAll(/\s+/g, "-")}.csv`,
        pdfFileName: `${input.title.toLowerCase().replaceAll(/\s+/g, "-")}.pdf`,
      };
    }),
});

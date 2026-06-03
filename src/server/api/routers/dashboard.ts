import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { getOrSetCache } from "@/server/cache/analytics-cache";

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAYS = 14;
const STAFF_TREND_DAYS = 7;

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

function formatFulfillmentLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function warehouseScopeFilter(ctx: {
  systemRole: string | null;
  managedWarehouseIds: string[];
}) {
  if (
    ctx.systemRole === "WAREHOUSE_MANAGER" &&
    ctx.managedWarehouseIds.length > 0
  ) {
    return { in: ctx.managedWarehouseIds };
  }
  return undefined;
}

export const dashboardRouter = createTRPCRouter({
  operatorCharts: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const warehouseFilter = warehouseScopeFilter(ctx);
      const cacheKey = `dashboard:${accountId}:operator:${warehouseFilter ? warehouseFilter.in.join(",") : "all"}`;

      return getOrSetCache({
        key: cacheKey,
        ttlSeconds: 300,
        compute: async () => {
          const now = new Date();
          const rangeStart = new Date(
            now.getTime() - (TREND_DAYS - 1) * DAY_MS,
          );
          const startDay = startOfUtcDay(rangeStart);
          const endDay = endOfUtcDay(now);

          const orderWhere = {
            accountId,
            ...(warehouseFilter ? { warehouseId: warehouseFilter } : {}),
          };

          const [ordersInRange, warehouses, merchants] =
            await ctx.db.$transaction([
              ctx.db.order.findMany({
                where: {
                  ...orderWhere,
                  createdAt: { gte: startDay, lte: endDay },
                },
                select: {
                  createdAt: true,
                  fulfillmentStatus: true,
                  warehouseId: true,
                  merchantId: true,
                },
              }),
              ctx.db.warehouse.findMany({
                where: {
                  accountId,
                  ...(warehouseFilter ? { id: warehouseFilter } : {}),
                },
                select: { id: true, name: true, code: true },
              }),
              ctx.db.merchant.findMany({
                where: { accountId },
                select: { id: true, name: true },
              }),
            ]);

          const dayKeys = daysBetween(startDay, now).map(toIsoDay);
          const trendMap = new Map(
            dayKeys.map((date) => [date, { date, created: 0, fulfilled: 0 }]),
          );

          const statusMap = new Map<string, number>();
          const warehouseMap = new Map<string, number>();
          const merchantOpenMap = new Map<string, number>();

          for (const order of ordersInRange) {
            const day = toIsoDay(order.createdAt);
            const row = trendMap.get(day);
            if (row) {
              row.created += 1;
              if (order.fulfillmentStatus === "FULFILLED") {
                row.fulfilled += 1;
              }
            }
            statusMap.set(
              order.fulfillmentStatus,
              (statusMap.get(order.fulfillmentStatus) ?? 0) + 1,
            );
            if (order.warehouseId) {
              warehouseMap.set(
                order.warehouseId,
                (warehouseMap.get(order.warehouseId) ?? 0) + 1,
              );
            }
          }

          const openOrders = await ctx.db.order.findMany({
            where: {
              ...orderWhere,
              fulfillmentStatus: { not: "FULFILLED" },
            },
            select: { merchantId: true },
          });
          for (const order of openOrders) {
            if (order.merchantId) {
              merchantOpenMap.set(
                order.merchantId,
                (merchantOpenMap.get(order.merchantId) ?? 0) + 1,
              );
            }
          }

          const warehouseNameById = new Map(
            warehouses.map((w) => [w.id, w.code || w.name]),
          );
          const merchantNameById = new Map(
            merchants.map((m) => [m.id, m.name]),
          );

          return {
            periodDays: TREND_DAYS,
            orderTrend: [...trendMap.values()],
            statusMix: [...statusMap.entries()].map(([status, value]) => ({
              name: formatFulfillmentLabel(status),
              value,
            })),
            byWarehouse: [...warehouseMap.entries()]
              .map(([warehouseId, value]) => ({
                name: warehouseNameById.get(warehouseId) ?? "Unknown",
                value,
              }))
              .sort((a, b) => b.value - a.value),
            topMerchants: [...merchantOpenMap.entries()]
              .map(([merchantId, value]) => ({
                name: merchantNameById.get(merchantId) ?? "Unknown",
                openOrders: value,
              }))
              .sort((a, b) => b.openOrders - a.openOrders)
              .slice(0, 5),
          };
        },
      });
    }),

  staffSummary: protectedProc
    .use(requireRole("WAREHOUSE_STAFF"))
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const warehouseIds = ctx.warehouseAssignments.map((a) => a.warehouseId);
      const cacheKey = `dashboard:${accountId}:staff:${warehouseIds.join(",") || "none"}`;

      return getOrSetCache({
        key: cacheKey,
        ttlSeconds: 180,
        compute: async () => {
          if (warehouseIds.length === 0) {
            return {
              periodDays: STAFF_TREND_DAYS,
              kpis: {
                pickListsDue: 0,
                posToReceive: 0,
                openOrders: 0,
                unitsPickedToday: 0,
                completedPicksToday: 0,
              },
              taskMix: [] as { name: string; value: number }[],
              pickTrend: [] as { date: string; units: number }[],
              warehouses: [] as {
                id: string;
                name: string;
                code: string | null;
              }[],
            };
          }

          const now = new Date();
          const startToday = startOfUtcDay(now);
          const endToday = endOfUtcDay(now);
          const rangeStart = new Date(
            now.getTime() - (STAFF_TREND_DAYS - 1) * DAY_MS,
          );
          const warehouseFilter = { in: warehouseIds };

          const [
            pickListsDue,
            posToReceive,
            openOrders,
            warehouses,
            pickItems,
            completedPicks,
          ] = await ctx.db.$transaction([
            ctx.db.pickList.count({
              where: {
                accountId,
                warehouseId: warehouseFilter,
                status: { in: ["PENDING", "IN_PROGRESS"] },
              },
            }),
            ctx.db.purchaseOrder.count({
              where: {
                accountId,
                warehouseId: warehouseFilter,
                status: {
                  in: ["SENT", "CONFIRMED", "IN_TRANSIT", "PARTIALLY_RECEIVED"],
                },
              },
            }),
            ctx.db.order.count({
              where: {
                accountId,
                warehouseId: warehouseFilter,
                fulfillmentStatus: { not: "FULFILLED" },
              },
            }),
            ctx.db.warehouse.findMany({
              where: { id: warehouseFilter },
              select: { id: true, name: true, code: true },
            }),
            ctx.db.pickListItem.findMany({
              where: {
                pickList: {
                  accountId,
                  warehouseId: warehouseFilter,
                  completedAt: {
                    gte: startOfUtcDay(rangeStart),
                    lte: endToday,
                  },
                },
              },
              select: {
                pickedQty: true,
                pickList: { select: { completedAt: true } },
              },
            }),
            ctx.db.pickList.count({
              where: {
                accountId,
                warehouseId: warehouseFilter,
                status: "COMPLETED",
                completedAt: { gte: startToday, lte: endToday },
              },
            }),
          ]);

          const unitsPickedToday = pickItems
            .filter(
              (item) =>
                item.pickList.completedAt &&
                item.pickList.completedAt >= startToday &&
                item.pickList.completedAt <= endToday,
            )
            .reduce((sum, item) => sum + item.pickedQty, 0);

          const dayKeys = daysBetween(startOfUtcDay(rangeStart), now).map(
            toIsoDay,
          );
          const pickTrendMap = new Map(
            dayKeys.map((date) => [date, { date, units: 0 }]),
          );
          for (const item of pickItems) {
            const completedAt = item.pickList.completedAt;
            if (!completedAt) continue;
            const day = toIsoDay(completedAt);
            const row = pickTrendMap.get(day);
            if (row) row.units += item.pickedQty;
          }

          const perms = ctx.warehouseAssignments.flatMap((a) => a.permissions);
          const taskMix: { name: string; value: number }[] = [];
          if (perms.includes("PICK")) {
            taskMix.push({ name: "Pick lists due", value: pickListsDue });
          }
          if (perms.includes("RECEIVE")) {
            taskMix.push({ name: "POs to receive", value: posToReceive });
          }
          if (perms.includes("PACK") || perms.includes("PICK")) {
            taskMix.push({ name: "Open orders", value: openOrders });
          }
          if (taskMix.length === 0) {
            taskMix.push(
              { name: "Pick lists due", value: pickListsDue },
              { name: "POs to receive", value: posToReceive },
              { name: "Open orders", value: openOrders },
            );
          }

          return {
            periodDays: STAFF_TREND_DAYS,
            kpis: {
              pickListsDue,
              posToReceive,
              openOrders,
              unitsPickedToday,
              completedPicksToday: completedPicks,
            },
            taskMix,
            pickTrend: [...pickTrendMap.values()],
            warehouses,
          };
        },
      });
    }),
});

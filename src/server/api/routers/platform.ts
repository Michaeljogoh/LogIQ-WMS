import { TRPCError } from "@trpc/server";
import { startOfMonth } from "date-fns";
import { z } from "zod";
import { authedProc, createTRPCRouter, requireRole } from "@/app/trpc/init";
import type { Plan } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { revokeBetterAuthSessions } from "@/lib/revoke-sessions";
import { limitsForPlan } from "@/server/billing/plan-limits";
import { getPolarAccessToken } from "@/server/billing/polar-config";
import { getOrSetCache } from "@/server/cache/analytics-cache";
import { tenantAccountListWhere } from "@/server/helpers/resolve-tenant-account";
import { formatSystemRoleLabel } from "@/server/helpers/team-invite";
import {
  isConfigurableOperatorRole,
  setMerchantUserActiveState,
  setOperatorActiveState,
} from "@/server/helpers/user-access";

const platformAdminOnly = requireRole("PLATFORM_ADMIN");
const DAY_MS = 24 * 60 * 60 * 1000;
const PLATFORM_TREND_DAYS = 14;

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

export const platformRouter = createTRPCRouter({
  overview: authedProc.use(platformAdminOnly).query(async () => {
    const where = tenantAccountListWhere();

    const [accountCount, warehouseCount, merchantCount, orderCount] =
      await db.$transaction([
        db.logiqAccount.count({ where }),
        db.warehouse.count({
          where: { account: where },
        }),
        db.merchant.count({
          where: { account: where },
        }),
        db.order.count({
          where: { account: where },
        }),
      ]);

    return {
      accountCount,
      warehouseCount,
      merchantCount,
      orderCount,
    };
  }),

  dashboardCharts: authedProc.use(platformAdminOnly).query(async () => {
    const where = tenantAccountListWhere();
    return getOrSetCache({
      key: "platform:dashboard-charts",
      ttlSeconds: 300,
      compute: async () => {
        const now = new Date();
        const rangeStart = new Date(
          now.getTime() - (PLATFORM_TREND_DAYS - 1) * DAY_MS,
        );
        const startDay = startOfUtcDay(rangeStart);
        const endDay = endOfUtcDay(now);

        const [ordersInRange, accounts, allOrdersByAccount] =
          await db.$transaction([
            db.order.findMany({
              where: {
                account: where,
                createdAt: { gte: startDay, lte: endDay },
              },
              select: { createdAt: true, accountId: true },
            }),
            db.logiqAccount.findMany({
              where,
              select: { id: true, name: true, plan: true },
            }),
            db.order.findMany({
              where: { account: where },
              select: { accountId: true },
            }),
          ]);

        const dayKeys = daysBetween(startDay, now).map(toIsoDay);
        const trendMap = new Map(
          dayKeys.map((date) => [date, { date, orders: 0 }]),
        );
        for (const order of ordersInRange) {
          const day = toIsoDay(order.createdAt);
          const row = trendMap.get(day);
          if (row) row.orders += 1;
        }

        const planMap = new Map<string, number>();
        for (const account of accounts) {
          planMap.set(account.plan, (planMap.get(account.plan) ?? 0) + 1);
        }

        const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

        const tenantOrderCounts = new Map<string, number>();
        for (const order of allOrdersByAccount) {
          tenantOrderCounts.set(
            order.accountId,
            (tenantOrderCounts.get(order.accountId) ?? 0) + 1,
          );
        }

        return {
          periodDays: PLATFORM_TREND_DAYS,
          orderTrend: [...trendMap.values()],
          planMix: [...planMap.entries()].map(([plan, value]) => ({
            name: plan.charAt(0) + plan.slice(1).toLowerCase(),
            value,
          })),
          topTenants: [...tenantOrderCounts.entries()]
            .map(([accountId, value]) => ({
              name: accountNameById.get(accountId) ?? "Unknown",
              value,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8),
        };
      },
    });
  }),

  accountsPageStats: authedProc.use(platformAdminOnly).query(async () => {
    const where = tenantAccountListWhere();
    const monthStart = startOfMonth(new Date());

    const [
      accountCount,
      warehouseCount,
      merchantCount,
      orderCount,
      ordersThisMonth,
      inactiveOperators,
      inactiveMerchants,
    ] = await db.$transaction([
      db.logiqAccount.count({ where }),
      db.warehouse.count({ where: { account: where } }),
      db.merchant.count({ where: { account: where } }),
      db.order.count({ where: { account: where } }),
      db.order.count({
        where: { account: where, createdAt: { gte: monthStart } },
      }),
      db.accountUser.count({
        where: {
          account: where,
          isActive: false,
          systemRole: { not: "PLATFORM_ADMIN" },
        },
      }),
      db.merchantUser.count({
        where: { account: where, isActive: false },
      }),
    ]);

    const accountsByPlan = await db.logiqAccount.findMany({
      where,
      select: { plan: true },
    });
    const planCounts: Record<string, number> = {};
    for (const row of accountsByPlan) {
      planCounts[row.plan] = (planCounts[row.plan] ?? 0) + 1;
    }

    return {
      accountCount,
      warehouseCount,
      merchantCount,
      orderCount,
      ordersThisMonth,
      inactiveOperators,
      inactiveMerchants,
      planCounts,
    };
  }),

  listAccounts: authedProc.use(platformAdminOnly).query(async () => {
    const accounts = await db.logiqAccount.findMany({
      where: tenantAccountListWhere(),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            warehouses: true,
            merchants: true,
            users: true,
            orders: true,
          },
        },
      },
    });

    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      plan: a.plan,
      createdAt: a.createdAt,
      warehouseCount: a._count.warehouses,
      merchantCount: a._count.merchants,
      userCount: a._count.users,
      orderCount: a._count.orders,
    }));
  }),

  getAccount: authedProc
    .use(platformAdminOnly)
    .input(z.object({ accountId: z.string().cuid() }))
    .query(async ({ input }) => {
      const account = await db.logiqAccount.findFirst({
        where: {
          id: input.accountId,
          ...tenantAccountListWhere(),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          polarCustomerId: true,
          createdAt: true,
          _count: {
            select: {
              warehouses: true,
              merchants: true,
              users: true,
              orders: true,
            },
          },
        },
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        id: account.id,
        name: account.name,
        slug: account.slug,
        plan: account.plan,
        polarCustomerId: account.polarCustomerId,
        createdAt: account.createdAt,
        warehouseCount: account._count.warehouses,
        merchantCount: account._count.merchants,
        userCount: account._count.users,
        orderCount: account._count.orders,
      };
    }),

  listBilling: authedProc.use(platformAdminOnly).query(async () => {
    const where = tenantAccountListWhere();
    const monthStart = startOfMonth(new Date());

    const accounts = await db.logiqAccount.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        polarCustomerId: true,
        createdAt: true,
        users: {
          where: { systemRole: "THREEPL_ACCOUNT_OWNER" },
          select: { email: true },
          take: 1,
        },
        _count: {
          select: {
            warehouses: true,
            merchants: true,
          },
        },
      },
    });

    const accountIds = accounts.map((a) => a.id);

    const [orderGroups, labelGroups] =
      accountIds.length > 0
        ? await Promise.all([
            db.order.groupBy({
              by: ["accountId"],
              where: {
                accountId: { in: accountIds },
                createdAt: { gte: monthStart },
                status: { not: "CANCELLED" },
              },
              _count: { id: true },
            }),
            db.shipment.groupBy({
              by: ["accountId"],
              where: {
                accountId: { in: accountIds },
                createdAt: { gte: monthStart },
                status: { not: "VOIDED" },
              },
              _count: { id: true },
            }),
          ])
        : [[], []];

    const ordersByAccount = new Map(
      orderGroups.map((row) => [row.accountId, row._count.id]),
    );
    const labelsByAccount = new Map(
      labelGroups.map((row) => [row.accountId, row._count.id]),
    );

    const planCounts: Record<Plan, number> = {
      STARTER: 0,
      GROWTH: 0,
      ENTERPRISE: 0,
    };

    let polarLinkedCount = 0;

    const rows = accounts.map((account) => {
      planCounts[account.plan] += 1;
      if (account.polarCustomerId) {
        polarLinkedCount += 1;
      }

      const limits = limitsForPlan(account.plan);
      const ordersThisMonth = ordersByAccount.get(account.id) ?? 0;
      const labelsThisMonth = labelsByAccount.get(account.id) ?? 0;
      const orderCap =
        limits.ordersPerMonth === Number.POSITIVE_INFINITY
          ? null
          : limits.ordersPerMonth;

      return {
        id: account.id,
        name: account.name,
        slug: account.slug,
        plan: account.plan,
        polarCustomerId: account.polarCustomerId,
        polarLinked: Boolean(account.polarCustomerId),
        ownerEmail: account.users[0]?.email ?? null,
        createdAt: account.createdAt,
        warehouseCount: account._count.warehouses,
        merchantCount: account._count.merchants,
        limits: {
          ordersPerMonth: orderCap,
          warehouses:
            limits.warehouses === Number.POSITIVE_INFINITY
              ? null
              : limits.warehouses,
          merchants:
            limits.merchants === Number.POSITIVE_INFINITY
              ? null
              : limits.merchants,
        },
        usage: {
          ordersThisMonth,
          labelsThisMonth,
          ordersUtilizationPct:
            orderCap != null && orderCap > 0
              ? Math.min(100, Math.round((ordersThisMonth / orderCap) * 100))
              : null,
        },
      };
    });

    return {
      polarConfigured: Boolean(getPolarAccessToken()),
      summary: {
        accountCount: accounts.length,
        polarLinkedCount,
        planCounts,
        totalOrdersThisMonth: rows.reduce(
          (sum, r) => sum + r.usage.ordersThisMonth,
          0,
        ),
        totalLabelsThisMonth: rows.reduce(
          (sum, r) => sum + r.usage.labelsThisMonth,
          0,
        ),
      },
      accounts: rows,
    };
  }),

  listWarehouses: authedProc.use(platformAdminOnly).query(async () => {
    const warehouses = await db.warehouse.findMany({
      where: { account: tenantAccountListWhere() },
      orderBy: [{ account: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        account: { select: { name: true } },
      },
    });

    return warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      code: w.code,
      accountName: w.account.name,
      label: `${w.account.name} · ${w.name}`,
    }));
  }),

  listUsers: authedProc
    .use(platformAdminOnly)
    .input(
      z.object({
        accountId: z.string().cuid().optional(),
        warehouseId: z.string().cuid().optional(),
        kind: z.enum(["all", "operator", "merchant"]).default("all"),
        search: z.string().max(200).optional(),
      }),
    )
    .query(async ({ input }) => {
      const accountWhere = tenantAccountListWhere();
      const search = input.search?.trim();

      const operators =
        input.kind === "merchant"
          ? []
          : await db.accountUser.findMany({
              where: {
                account: accountWhere,
                ...(input.accountId ? { accountId: input.accountId } : {}),
                systemRole: { not: "PLATFORM_ADMIN" },
                ...(input.warehouseId
                  ? {
                      OR: [
                        {
                          warehouseAssignments: {
                            some: { warehouseId: input.warehouseId },
                          },
                        },
                        {
                          managedWarehouses: {
                            some: { warehouseId: input.warehouseId },
                          },
                        },
                      ],
                    }
                  : {}),
                ...(search
                  ? {
                      OR: [
                        { email: { contains: search, mode: "insensitive" } },
                        {
                          firstName: { contains: search, mode: "insensitive" },
                        },
                        { lastName: { contains: search, mode: "insensitive" } },
                      ],
                    }
                  : {}),
              },
              orderBy: [{ account: { name: "asc" } }, { email: "asc" }],
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                systemRole: true,
                isActive: true,
                deactivatedAt: true,
                createdAt: true,
                account: { select: { id: true, name: true, slug: true } },
                _count: {
                  select: {
                    warehouseAssignments: true,
                    managedWarehouses: true,
                  },
                },
              },
            });

      const merchants =
        input.kind === "operator"
          ? []
          : await db.merchantUser.findMany({
              where: {
                account: accountWhere,
                ...(input.accountId ? { accountId: input.accountId } : {}),
                ...(search
                  ? {
                      OR: [
                        { email: { contains: search, mode: "insensitive" } },
                        {
                          firstName: { contains: search, mode: "insensitive" },
                        },
                        { lastName: { contains: search, mode: "insensitive" } },
                      ],
                    }
                  : {}),
              },
              orderBy: [{ account: { name: "asc" } }, { email: "asc" }],
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                systemRole: true,
                permissions: true,
                isActive: true,
                deactivatedAt: true,
                betterAuthUserId: true,
                createdAt: true,
                account: { select: { id: true, name: true } },
                merchant: { select: { id: true, name: true } },
              },
            });

      return {
        operators: operators.map((u) => ({
          kind: "operator" as const,
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          displayName:
            [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
            u.email,
          systemRole: u.systemRole,
          roleLabel: formatSystemRoleLabel(u.systemRole),
          isActive: u.isActive,
          deactivatedAt: u.deactivatedAt,
          accountId: u.account.id,
          accountName: u.account.name,
          warehouseAssignmentCount:
            u._count.warehouseAssignments + u._count.managedWarehouses,
          createdAt: u.createdAt,
        })),
        merchants: merchants.map((u) => ({
          kind: "merchant" as const,
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          displayName:
            [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
            u.email,
          systemRole: u.systemRole,
          roleLabel: formatSystemRoleLabel(u.systemRole),
          permissions: u.permissions,
          isActive: u.isActive,
          deactivatedAt: u.deactivatedAt,
          hasSignedIn: Boolean(u.betterAuthUserId),
          accountId: u.account.id,
          accountName: u.account.name,
          merchantId: u.merchant.id,
          merchantName: u.merchant.name,
          createdAt: u.createdAt,
        })),
      };
    }),

  setUserActive: authedProc
    .use(platformAdminOnly)
    .input(
      z.object({
        kind: z.enum(["operator", "merchant"]),
        id: z.string().cuid(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.kind === "operator") {
        await setOperatorActiveState({
          accountUserId: input.id,
          isActive: input.isActive,
        });
      } else {
        await setMerchantUserActiveState({
          merchantUserId: input.id,
          isActive: input.isActive,
        });
      }
      return { ok: true as const };
    }),

  updateOperator: authedProc
    .use(platformAdminOnly)
    .input(
      z.object({
        accountUserId: z.string().cuid(),
        systemRole: z
          .enum([
            "THREEPL_ACCOUNT_OWNER",
            "WAREHOUSE_MANAGER",
            "WAREHOUSE_STAFF",
          ])
          .optional(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.accountUser.findFirst({
        where: {
          id: input.accountUserId,
          account: tenantAccountListWhere(),
        },
        select: {
          id: true,
          betterAuthUserId: true,
          systemRole: true,
          isActive: true,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!isConfigurableOperatorRole(existing.systemRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This operator profile cannot be modified.",
        });
      }

      const nextRole = input.systemRole ?? existing.systemRole;
      if (!isConfigurableOperatorRole(nextRole)) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const updated = await db.accountUser.update({
        where: { id: existing.id },
        data: {
          ...(input.systemRole ? { systemRole: input.systemRole } : {}),
          ...(input.firstName !== undefined
            ? { firstName: input.firstName }
            : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        },
      });

      if (input.systemRole && input.systemRole !== existing.systemRole) {
        await revokeBetterAuthSessions(existing.betterAuthUserId);
      }

      return {
        ok: true as const,
        user: {
          id: updated.id,
          systemRole: updated.systemRole,
          roleLabel: formatSystemRoleLabel(updated.systemRole),
        },
      };
    }),

  updateMerchantUser: authedProc
    .use(platformAdminOnly)
    .input(
      z.object({
        merchantUserId: z.string().cuid(),
        systemRole: z.enum(["MERCHANT_OWNER", "MERCHANT_USER"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.merchantUser.findFirst({
        where: {
          id: input.merchantUserId,
          account: tenantAccountListWhere(),
        },
        select: {
          id: true,
          betterAuthUserId: true,
          systemRole: true,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updated = await db.merchantUser.update({
        where: { id: existing.id },
        data: {
          ...(input.systemRole ? { systemRole: input.systemRole } : {}),
        },
      });

      if (
        input.systemRole &&
        input.systemRole !== existing.systemRole &&
        existing.betterAuthUserId
      ) {
        await revokeBetterAuthSessions(existing.betterAuthUserId);
      }

      return {
        ok: true as const,
        user: {
          id: updated.id,
          systemRole: updated.systemRole,
          roleLabel: formatSystemRoleLabel(updated.systemRole),
        },
      };
    }),
});

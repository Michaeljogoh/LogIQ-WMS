import { z } from "zod";
import {
  authedProc,
  createTRPCRouter,
  requireRole,
} from "@/app/trpc/init";
import type { SystemRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AUDIT_EVENT_SOURCES } from "@/lib/audit";
import { SYSTEM_ROLES } from "@/lib/system-roles";
import { tenantAccountListWhere } from "@/server/helpers/resolve-tenant-account";
import { formatSystemRoleLabel } from "@/server/helpers/team-invite";

const platformAdminOnly = requireRole("PLATFORM_ADMIN");

const systemRoleSchema = z.enum(SYSTEM_ROLES);
const sourceSchema = z.enum(AUDIT_EVENT_SOURCES);

export const platformAuditRouter = createTRPCRouter({
  listEvents: authedProc
    .use(platformAdminOnly)
    .input(
      z.object({
        accountId: z.string().cuid().optional(),
        systemRole: systemRoleSchema.optional(),
        source: sourceSchema.optional(),
        action: z.string().max(120).optional(),
        search: z.string().max(200).optional(),
        page: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      const search = input.search?.trim();
      const where = {
        ...(input.accountId ? { accountId: input.accountId } : {}),
        ...(input.systemRole ? { systemRole: input.systemRole } : {}),
        ...(input.source ? { source: input.source } : {}),
        ...(input.action ? { action: input.action } : {}),
        ...(search
          ? {
              OR: [
                { action: { contains: search, mode: "insensitive" as const } },
                { reason: { contains: search, mode: "insensitive" as const } },
                {
                  procedurePath: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  actorEmail: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  actorName: { contains: search, mode: "insensitive" as const },
                },
              ],
            }
          : {}),
      };

      const [events, total] = await db.$transaction([
        db.auditEvent.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: input.page * input.limit,
          take: input.limit,
          include: {
            account: { select: { name: true } },
            merchant: { select: { name: true } },
          },
        }),
        db.auditEvent.count({ where }),
      ]);

      return {
        total,
        page: input.page,
        limit: input.limit,
        items: events.map((event) => ({
          id: event.id,
          action: event.action,
          source: event.source,
          procedurePath: event.procedurePath,
          reason: event.reason,
          accountId: event.accountId,
          accountName: event.account?.name ?? null,
          merchantId: event.merchantId,
          merchantName: event.merchant?.name ?? null,
          actorUserId: event.actorUserId,
          actorEmail: event.actorEmail,
          actorName: event.actorName,
          systemRole: event.systemRole,
          systemRoleLabel: event.systemRole
            ? formatSystemRoleLabel(event.systemRole as SystemRole)
            : null,
          ipAddress: event.ipAddress,
          createdAt: event.createdAt.toISOString(),
        })),
      };
    }),

  listActions: authedProc.use(platformAdminOnly).query(async () => {
    const rows = await db.auditEvent.groupBy({
      by: ["action"],
      orderBy: { action: "asc" },
    });
    return rows.map((r) => r.action);
  }),

  listRoleCounts: authedProc.use(platformAdminOnly).query(async () => {
    const rows = await db.auditEvent.groupBy({
      by: ["systemRole"],
      _count: { _all: true },
      orderBy: { systemRole: "asc" },
    });
    return rows.map((row) => ({
      systemRole: row.systemRole,
      systemRoleLabel: row.systemRole
        ? formatSystemRoleLabel(row.systemRole as SystemRole)
        : "Unknown",
      count: row._count._all,
    }));
  }),

  listAccountsForFilter: authedProc.use(platformAdminOnly).query(async () => {
    const accounts = await db.logiqAccount.findMany({
      where: tenantAccountListWhere(),
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return accounts;
  }),
});

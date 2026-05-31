import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  authedProc,
  createTRPCRouter,
  requireRole,
} from "@/app/trpc/init";
import { db } from "@/lib/db";
import {
  ESCALATED_SUPPORT_ACTIONS,
  type EscalatedSupportAction,
} from "@/lib/platform-support";
import { tenantAccountListWhere } from "@/server/helpers/resolve-tenant-account";
import { createEmergencyAccessRequest } from "@/server/helpers/platform-support-access";
import { executeEscalatedSupportAction } from "@/server/helpers/platform-support-actions";
import {
  getClientIpFromRequest,
  logPlatformSupportAudit,
} from "@/server/helpers/platform-support-audit";
import {
  getActivePlatformSupportSession,
  isPlatformSupportMfaFresh,
} from "@/server/helpers/platform-support-session";

const platformAdminOnly = requireRole("PLATFORM_ADMIN");

const escalatedActionSchema = z.enum(ESCALATED_SUPPORT_ACTIONS);

export const platformSupportRouter = createTRPCRouter({
  getStatus: authedProc.use(platformAdminOnly).query(async ({ ctx }) => {
    const session = await getActivePlatformSupportSession(
      ctx.req.headers.get("cookie"),
    );

    const pendingRequests = await db.platformSupportAccessRequest.findMany({
      where: {
        requestedByUserId: ctx.userId as string,
        status: { in: ["PENDING", "APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    const mfaUser = await db.user.findUnique({
      where: { id: ctx.userId as string },
      select: { twoFactorEnabled: true },
    });

    return {
      activeSession: session
        ? {
            id: session.id,
            accountId: session.accountId,
            accountName: session.accountName,
            level: session.level,
            reason: session.reason,
            expiresAt: session.expiresAt.toISOString(),
          }
        : null,
      mfaEnabled: mfaUser?.twoFactorEnabled === true,
      mfaVerifiedRecently: await isPlatformSupportMfaFresh(
        ctx.req.headers.get("cookie"),
      ),
      accessRequests: pendingRequests.map((r) => ({
        id: r.id,
        accountId: r.accountId,
        accountName: r.account.name,
        status: r.status,
        reason: r.reason,
        requestExpiresAt: r.requestExpiresAt.toISOString(),
        approvedAt: r.approvedAt?.toISOString() ?? null,
        impersonationExpiresAt:
          r.impersonationExpiresAt?.toISOString() ?? null,
      })),
    };
  }),

  listAccountsForSupport: authedProc.use(platformAdminOnly).query(async () => {
    const accounts = await db.logiqAccount.findMany({
      where: tenantAccountListWhere(),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        _count: {
          select: {
            warehouses: true,
            merchants: true,
            orders: true,
            users: true,
          },
        },
      },
    });

    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      plan: a.plan,
      warehouseCount: a._count.warehouses,
      merchantCount: a._count.merchants,
      orderCount: a._count.orders,
      userCount: a._count.users,
    }));
  }),

  listEscalationTargets: authedProc
    .use(platformAdminOnly)
    .input(
      z.object({
        accountId: z.string().cuid(),
        action: escalatedActionSchema,
      }),
    )
    .query(async ({ input }) => {
      const accountWhere = { id: input.accountId, ...tenantAccountListWhere() };

      switch (input.action) {
        case "UNLOCK_STUCK_SHIPMENT":
        case "REGENERATE_LABEL": {
          const shipments = await db.shipment.findMany({
            where: {
              account: accountWhere,
              ...(input.action === "UNLOCK_STUCK_SHIPMENT"
                ? { status: "EXCEPTION" }
                : {}),
            },
            orderBy: { createdAt: "desc" },
            take: 30,
            select: {
              id: true,
              trackingNumber: true,
              status: true,
              order: { select: { channelOrderId: true } },
            },
          });
          return shipments.map((s) => ({
            id: s.id,
            label: `${s.order.channelOrderId} · ${s.status}${s.trackingNumber ? ` · ${s.trackingNumber}` : ""}`,
          }));
        }
        case "REQUEUE_WEBHOOK": {
          const endpoints = await db.webhookEndpoint.findMany({
            where: { account: accountWhere, isActive: true },
            select: { id: true, url: true },
          });
          return endpoints.map((e) => ({
            id: e.id,
            label: e.url,
          }));
        }
        case "RETRY_SYNC": {
          const integrations = await db.integration.findMany({
            where: { account: accountWhere, status: "CONNECTED" },
            select: { id: true, type: true },
          });
          return integrations.map((i) => ({
            id: i.id,
            label: i.type,
          }));
        }
        default:
          return [];
      }
    }),

  requestEmergencyAccess: authedProc
    .use(platformAdminOnly)
    .input(
      z.object({
        accountId: z.string().cuid(),
        reason: z.string().min(10).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authUser = await db.user.findUnique({
        where: { id: ctx.userId as string },
        select: { email: true, name: true, twoFactorEnabled: true },
      });

      if (!authUser?.twoFactorEnabled) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Enable two-factor authentication on your platform admin account before requesting emergency access.",
        });
      }

      const result = await createEmergencyAccessRequest({
        accountId: input.accountId,
        platformAdminUserId: ctx.userId as string,
        platformAdminEmail: authUser.email,
        platformAdminName: authUser.name,
        reason: input.reason,
        ipAddress: getClientIpFromRequest(ctx.req),
      });

      return {
        requestId: result.requestId,
        expiresAt: result.expiresAt.toISOString(),
      };
    }),

  executeEscalatedAction: authedProc
    .use(platformAdminOnly)
    .input(
      z.object({
        accountId: z.string().cuid(),
        action: escalatedActionSchema,
        targetId: z.string().cuid(),
        reason: z.string().min(10).max(2000),
        confirmPhrase: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const expected = `EXECUTE ${input.action}`;
      if (input.confirmPhrase !== expected) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Type "${expected}" to confirm`,
        });
      }

      const result = await executeEscalatedSupportAction({
        accountId: input.accountId,
        action: input.action as EscalatedSupportAction,
        targetId: input.targetId,
      });

      await logPlatformSupportAudit({
        platformAdminUserId: ctx.userId as string,
        accountId: input.accountId,
        action: `ESCALATED_${input.action}`,
        reason: input.reason,
        ipAddress: getClientIpFromRequest(ctx.req),
        metadata: { targetId: input.targetId },
      });

      return result;
    }),
});

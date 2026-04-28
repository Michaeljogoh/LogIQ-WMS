import { TRPCError } from "@trpc/server";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant, requireUserId } from "@/server/api/ctx-ids";

const notificationTypeEnum = z.enum([
  "LOW_STOCK",
  "DEAD_STOCK",
  "STOCKOUT_RISK",
  "SLA_BREACH",
  "ORDER_EXCEPTION",
  "SHIPMENT_DELIVERED",
  "INVOICE_GENERATED",
  "INVOICE_OVERDUE",
  "CYCLE_COUNT_DUE",
  "PO_OVERDUE",
  "CARRIER_EXCEPTION",
  "CAPACITY_WARNING",
]);

const severityEnum = z.enum(["INFO", "WARNING", "CRITICAL"]);

export const notificationsRouter = createTRPCRouter({
  list: protectedProc
    .input(
      z.object({
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const userId = requireUserId(ctx);

      const where: {
        accountId: string;
        OR: Array<{ userId: string | null }>;
      } = {
        accountId,
        OR: [{ userId }, { userId: null }],
      };

      const items = await ctx.db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const unreadCount = await ctx.db.notification.count({
        where: {
          ...where,
          readAt: null,
        },
      });
      const hasNext = items.length > input.limit;
      return {
        items: hasNext ? items.slice(0, -1) : items,
        nextCursor: hasNext ? (items[items.length - 2]?.id ?? null) : null,
        unreadCount,
      };
    }),

  markRead: protectedProc
    .input(
      z.object({
        notificationId: z.string().cuid().optional(),
        markAll: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const userId = requireUserId(ctx);
      if (input.markAll) {
        const updated = await ctx.db.notification.updateMany({
          where: {
            accountId,
            OR: [{ userId }, { userId: null }],
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        return { updated: updated.count };
      }
      if (!input.notificationId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "notificationId is required unless markAll is true.",
        });
      }
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.notificationId,
          accountId,
          OR: [{ userId }, { userId: null }],
        },
        select: { id: true },
      });
      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found.",
        });
      }
      await ctx.db.notification.update({
        where: { id: notification.id },
        data: { readAt: new Date() },
      });
      return { updated: 1 };
    }),

  getPreferences: protectedProc.query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    const userId = requireUserId(ctx);

    const existing = await ctx.db.notificationPreference.findMany({
      where: { accountId, userId },
      orderBy: { type: "asc" },
    });
    const existingTypes = new Set(existing.map((row) => row.type));
    const missing = notificationTypeEnum.options.filter(
      (type) => !existingTypes.has(type),
    );
    if (missing.length) {
      await ctx.db.notificationPreference.createMany({
        data: missing.map((type) => ({
          accountId,
          userId,
          type,
          inApp: true,
          email: true,
          slack: false,
          sms: false,
          push: true,
        })),
      });
    }
    return ctx.db.notificationPreference.findMany({
      where: { accountId, userId },
      orderBy: { type: "asc" },
    });
  }),

  updatePreference: protectedProc
    .input(
      z.object({
        type: notificationTypeEnum,
        inApp: z.boolean().optional(),
        email: z.boolean().optional(),
        slack: z.boolean().optional(),
        sms: z.boolean().optional(),
        push: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const userId = requireUserId(ctx);
      return ctx.db.notificationPreference.upsert({
        where: { userId_type: { userId, type: input.type } },
        update: {
          ...(typeof input.inApp === "boolean" ? { inApp: input.inApp } : {}),
          ...(typeof input.email === "boolean" ? { email: input.email } : {}),
          ...(typeof input.slack === "boolean" ? { slack: input.slack } : {}),
          ...(typeof input.sms === "boolean" ? { sms: input.sms } : {}),
          ...(typeof input.push === "boolean" ? { push: input.push } : {}),
        },
        create: {
          accountId,
          userId,
          type: input.type,
          inApp: input.inApp ?? true,
          email: input.email ?? true,
          slack: input.slack ?? false,
          sms: input.sms ?? false,
          push: input.push ?? true,
        },
      });
    }),

  subscribe: protectedProc
    .input(
      z.object({
        endpoint: z.string().url(),
        subscription: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const userId = requireUserId(ctx);
      const subscription = JSON.parse(
        JSON.stringify(input.subscription),
      ) as Prisma.InputJsonValue;
      return ctx.db.pushSubscription.upsert({
        where: {
          userId_endpoint: {
            userId,
            endpoint: input.endpoint,
          },
        },
        update: {
          subscription,
        },
        create: {
          accountId,
          userId,
          endpoint: input.endpoint,
          subscription,
        },
      });
    }),
});

export const escalationRouter = createTRPCRouter({
  getRules: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.escalationRule.findMany({
        where: { accountId },
        orderBy: { severity: "asc" },
      });
    }),

  upsertRule: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .input(
      z.object({
        severity: severityEnum,
        ackWindowMinutes: z.number().int().min(1).max(1440).default(120),
        escalateTo: z.array(z.string().cuid()).default([]),
        escalateViaSms: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.escalationRule.upsert({
        where: {
          accountId_severity: {
            accountId,
            severity: input.severity,
          },
        },
        update: {
          ackWindowMinutes: input.ackWindowMinutes,
          escalateTo: input.escalateTo,
          escalateViaSms: input.escalateViaSms,
        },
        create: {
          accountId,
          severity: input.severity,
          ackWindowMinutes: input.ackWindowMinutes,
          escalateTo: input.escalateTo,
          escalateViaSms: input.escalateViaSms,
        },
      });
    }),
});

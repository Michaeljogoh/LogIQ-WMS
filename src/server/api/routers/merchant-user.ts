import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  authedProc,
  createTRPCRouter,
  protectedProc,
  requireRole,
} from "@/app/trpc/init";
import type { MerchantPermission } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { revokeBetterAuthSessions } from "@/lib/revoke-sessions";
import { requireLinkedTenant, requireUserId } from "@/server/api/ctx-ids";

async function assertMerchantOwnerForMerchant(params: {
  db: typeof import("@/lib/db").db;
  accountId: string;
  userId: string;
  systemRole: string | null;
  merchantId: string;
}) {
  if (params.systemRole === "PLATFORM_ADMIN") {
    return;
  }

  const owner = await params.db.merchantUser.findFirst({
    where: {
      merchantId: params.merchantId,
      accountId: params.accountId,
      betterAuthUserId: params.userId,
      systemRole: "MERCHANT_OWNER",
    },
  });

  if (!owner) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const merchantUserRouter = createTRPCRouter({
  claim: authedProc
    .input(z.object({ merchantUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx);
      const row = await ctx.db.merchantUser.findFirst({
        where: {
          id: input.merchantUserId,
          betterAuthUserId: null,
        },
      });
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
      });
      if (!user || user.email.toLowerCase() !== row.email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.merchantUser.update({
        where: { id: row.id },
        data: { betterAuthUserId: userId },
      });

      return { ok: true as const };
    }),

  invite: protectedProc
    .use(requireRole("MERCHANT_OWNER", "PLATFORM_ADMIN"))
    .input(
      z.object({
        merchantId: z.string(),
        email: z.string().email(),
        permissions: z.array(z.enum(["READ", "WRITE", "BILLING"])),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const merchant = await ctx.db.merchant.findFirst({
        where: { id: input.merchantId, accountId },
      });
      if (!merchant) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertMerchantOwnerForMerchant({
        db: ctx.db,
        accountId,
        userId,
        systemRole: ctx.systemRole,
        merchantId: input.merchantId,
      });

      const acting = await ctx.db.merchantUser.findFirst({
        where: {
          betterAuthUserId: userId,
          merchantId: input.merchantId,
        },
      });

      let invitedById = acting?.id;
      if (!invitedById) {
        const ownerRecord = await ctx.db.merchantUser.findFirst({
          where: {
            merchantId: input.merchantId,
            systemRole: "MERCHANT_OWNER",
          },
          select: { id: true },
        });
        invitedById = ownerRecord?.id ?? "system";
      }

      const invited = await ctx.db.merchantUser.create({
        data: {
          accountId,
          merchantId: input.merchantId,
          systemRole: "MERCHANT_USER",
          permissions: input.permissions as MerchantPermission[],
          email: input.email,
          invitedBy: invitedById,
        },
      });

      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await auth.api.signInMagicLink({
        body: {
          email: input.email,
          callbackURL: `${base}/portal/dashboard?merchantUserId=${invited.id}`,
        },
        headers: ctx.req.headers,
      });

      return { id: invited.id };
    }),

  update: protectedProc
    .use(requireRole("MERCHANT_OWNER", "PLATFORM_ADMIN"))
    .input(
      z.object({
        merchantUserId: z.string(),
        permissions: z.array(z.enum(["READ", "WRITE", "BILLING"])),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const target = await ctx.db.merchantUser.findFirst({
        where: {
          id: input.merchantUserId,
          accountId,
          systemRole: "MERCHANT_USER",
        },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertMerchantOwnerForMerchant({
        db: ctx.db,
        accountId,
        userId,
        systemRole: ctx.systemRole,
        merchantId: target.merchantId,
      });

      await ctx.db.merchantUser.update({
        where: { id: target.id },
        data: {
          permissions: input.permissions as MerchantPermission[],
        },
      });

      if (target.betterAuthUserId) {
        await revokeBetterAuthSessions(target.betterAuthUserId);
      }

      return { ok: true as const };
    }),

  listForMerchant: protectedProc
    .use(requireRole("MERCHANT_OWNER", "MERCHANT_USER", "PLATFORM_ADMIN"))
    .input(z.object({ merchantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      const merchant = await ctx.db.merchant.findFirst({
        where: { id: input.merchantId, accountId },
      });
      if (!merchant) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (ctx.systemRole !== "PLATFORM_ADMIN") {
        const self = await ctx.db.merchantUser.findFirst({
          where: {
            merchantId: input.merchantId,
            betterAuthUserId: userId,
          },
        });
        if (!self) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      return ctx.db.merchantUser.findMany({
        where: { merchantId: input.merchantId, accountId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          systemRole: true,
          permissions: true,
          betterAuthUserId: true,
          createdAt: true,
        },
      });
    }),
});

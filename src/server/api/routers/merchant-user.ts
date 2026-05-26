import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProc,
  requireRole,
} from "@/app/trpc/init";
import type { MerchantPermission } from "@/generated/prisma/client";
import { revokeBetterAuthSessions } from "@/lib/revoke-sessions";
import { requireLinkedTenant, requireUserId } from "@/server/api/ctx-ids";
import { inviteMerchantUser } from "@/server/helpers/merchant-team-invite";

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

      const result = await inviteMerchantUser({
        accountId,
        merchantId: input.merchantId,
        email: input.email,
        name: input.email,
        systemRole: "MERCHANT_USER",
        permissions: input.permissions as MerchantPermission[],
        invitedBy: invitedById,
      });

      return { id: result.merchantUserId };
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

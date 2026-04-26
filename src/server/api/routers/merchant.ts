import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { auth } from "@/lib/auth";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

export const merchantRouter = createTRPCRouter({
  list: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.merchant.findMany({
        where: { accountId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      });
    }),

  create: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      let inviter = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
      });
      if (!inviter && ctx.systemRole === "PLATFORM_ADMIN") {
        inviter = await ctx.db.accountUser.findFirst({
          where: { accountId },
        });
      }
      if (!inviter) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Operator profile is not linked to this session.",
        });
      }

      const merchant = await ctx.db.merchant.create({
        data: {
          accountId,
          name: input.name,
          email: input.email,
        },
      });

      const merchantUser = await ctx.db.merchantUser.create({
        data: {
          accountId,
          merchantId: merchant.id,
          systemRole: "MERCHANT_OWNER",
          permissions: [],
          email: input.email,
          invitedBy: inviter.id,
        },
      });

      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const callbackURL = `${base}/portal/dashboard?merchantUserId=${merchantUser.id}`;

      await auth.api.signInMagicLink({
        body: {
          email: input.email,
          callbackURL,
          name: input.name,
        },
        headers: ctx.req.headers,
      });

      return { merchantId: merchant.id, merchantUserId: merchantUser.id };
    }),
});

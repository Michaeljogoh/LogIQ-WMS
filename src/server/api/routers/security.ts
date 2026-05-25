import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canDisableTwoFactor } from "@/lib/two-factor-policy";
import { db } from "@/lib/db";
import {
  authedProc,
  createTRPCRouter,
} from "@/app/trpc/init";
import { requireUserId } from "@/server/api/ctx-ids";

async function getAuthUserFlags(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      twoFactorEnabled: true,
      twoFactorSetupCompleted: true,
    },
  });
}

export const securityRouter = createTRPCRouter({
  getTwoFactorStatus: authedProc.query(async ({ ctx }) => {
    const userId = requireUserId(ctx);
    const user = await getAuthUserFlags(userId);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return {
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSetupCompleted: user.twoFactorSetupCompleted,
      canDisable: canDisableTwoFactor(user),
    };
  }),

  completeTwoFactorSetup: authedProc.mutation(async ({ ctx }) => {
    const userId = requireUserId(ctx);
    const user = await getAuthUserFlags(userId);
    if (!user?.twoFactorEnabled) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Verify your email code before continuing.",
      });
    }

    await db.user.update({
      where: { id: userId },
      data: { twoFactorSetupCompleted: true },
    });

    return { ok: true as const };
  }),

  disableTwoFactor: authedProc
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx);
      const user = await getAuthUserFlags(userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await auth.api.disableTwoFactor({
        body: { password: input.password },
        headers: ctx.req.headers,
      });

      await db.user.update({
        where: { id: userId },
        data: { twoFactorSetupCompleted: true },
      });

      return { ok: true as const };
    }),
});

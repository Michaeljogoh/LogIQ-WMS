import { TRPCError } from "@trpc/server";

export function requireLinkedTenant(ctx: {
  userId: string | null;
  accountId: string | null;
}): { userId: string; accountId: string } {
  if (!ctx.userId || !ctx.accountId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return { userId: ctx.userId, accountId: ctx.accountId };
}

export function requireUserId(ctx: { userId: string | null }): string {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return ctx.userId;
}

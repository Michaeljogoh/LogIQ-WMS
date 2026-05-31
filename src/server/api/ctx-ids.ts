import { TRPCError } from "@trpc/server";
import { resolveTenantAccountId } from "@/server/helpers/resolve-tenant-account";

type LinkedTenantCtx = {
  userId: string | null;
  accountId: string | null;
  systemRole: string | null;
  activeAccountId: string | null;
};

export function requireLinkedTenant(ctx: LinkedTenantCtx): {
  userId: string;
  accountId: string;
} {
  const userId = ctx.userId;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const accountId = resolveTenantAccountId(ctx);

  return { userId, accountId };
}

export function requireUserId(ctx: { userId: string | null }): string {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return ctx.userId;
}

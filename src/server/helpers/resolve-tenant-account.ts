import { TRPCError } from "@trpc/server";
import { PLATFORM_INTERNAL_ACCOUNT_SLUG } from "@/lib/system-roles";

type Ctx = {
  userId: string | null;
  accountId: string | null;
  systemRole: string | null;
  activeAccountId: string | null;
};

export function resolveTenantAccountId(ctx: Ctx): string {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (ctx.systemRole === "PLATFORM_ADMIN") {
    if (!ctx.activeAccountId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Select a tenant account from the platform dashboard before using operator tools.",
      });
    }
    return ctx.activeAccountId;
  }

  if (!ctx.accountId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return ctx.accountId;
}

/** Accounts shown in platform admin tenant picker (excludes internal platform org). */
export function tenantAccountListWhere() {
  return {
    slug: { not: PLATFORM_INTERNAL_ACCOUNT_SLUG },
  } as const;
}

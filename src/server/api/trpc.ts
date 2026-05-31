import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseActiveAccountIdFromCookieHeader } from "@/lib/platform-account";
import type { PlatformSupportLevel } from "@/lib/platform-support";
import {
  getActivePlatformSupportSession,
  resolvePlatformTenantAccountId,
} from "@/server/helpers/platform-support-session";
import type { SystemCapability } from "@/lib/system-permissions";
import { hasSystemCapability } from "@/lib/system-permissions";
import { parseWarehouseAssignments } from "@/server/helpers/warehouse-assignments";
import { resolveTenantAccountId } from "@/server/helpers/resolve-tenant-account";
import { assertBetterAuthUserIsActive } from "@/server/helpers/user-access";
import { logAuditFromTrpcMutation } from "@/server/helpers/audit-log";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  accountId?: string | null;
  systemRole?: string | null;
  managedWarehouseIds?: string[] | null;
  warehouseAssignments?: string | null;
  merchantId?: string | null;
  merchantPermissions?: string[] | null;
};

export const createTRPCContext = async (opts: { req: Request }) => {
  const session = await auth.api.getSession({ headers: opts.req.headers });
  const user = session?.user as SessionUser | undefined;
  const warehouseAssignments = parseWarehouseAssignments(
    user?.warehouseAssignments,
  );
  const cookieHeader = opts.req.headers.get("cookie");
  const platformSupportSession =
    await getActivePlatformSupportSession(cookieHeader);
  const activeAccountId =
    (await resolvePlatformTenantAccountId({
      cookieHeader,
      supportSession: platformSupportSession,
    })) ?? parseActiveAccountIdFromCookieHeader(cookieHeader);

  return {
    db,
    req: opts.req,
    session,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userName: user?.name ?? null,
    accountId: user?.accountId ?? null,
    activeAccountId,
    platformSupportSession: platformSupportSession
      ? {
          id: platformSupportSession.id,
          level: platformSupportSession.level as PlatformSupportLevel,
          accountId: platformSupportSession.accountId,
          expiresAt: platformSupportSession.expiresAt,
        }
      : null,
    systemRole: user?.systemRole ?? null,
    managedWarehouseIds: (user?.managedWarehouseIds ?? []) as string[],
    warehouseAssignments,
    merchantId: user?.merchantId ?? null,
    merchantPermissions: (user?.merchantPermissions ?? []) as string[],
  };
};

export const createTRPCContextFromHeaders = async (headers: Headers) => {
  const req = new Request("http://localhost/trpc-context", { headers });
  return createTRPCContext({ req });
};

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

const enforcePlatformReadOnlySupport = t.middleware(({ ctx, next, type }) => {
  if (
    type === "mutation" &&
    ctx.systemRole === "PLATFORM_ADMIN" &&
    ctx.platformSupportSession?.level === "READ_ONLY"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Read-only support mode — mutations are disabled. Use escalated actions on the Support page or approved emergency impersonation.",
    });
  }

  return next({ ctx });
});

const recordMutationAudit = t.middleware(async ({ ctx, next, path, type }) => {
  const result = await next();
  if (type === "mutation" && ctx.userId) {
    const auditCtx = {
      userId: ctx.userId,
      userEmail: "userEmail" in ctx ? (ctx.userEmail as string | null) : null,
      userName: "userName" in ctx ? (ctx.userName as string | null) : null,
      systemRole: ctx.systemRole,
      accountId: "accountId" in ctx ? (ctx.accountId as string | null) : null,
      merchantId: ctx.merchantId,
      req: ctx.req,
    };
    void logAuditFromTrpcMutation(auditCtx, path).catch((error) => {
      console.error("[audit] Failed to record mutation:", path, error);
    });
  }
  return result;
});

const enforceLinkedTenant = t.middleware(({ ctx, next }) => {
  const accountId = resolveTenantAccountId({
    userId: ctx.userId,
    accountId: ctx.accountId,
    systemRole: ctx.systemRole,
    activeAccountId: ctx.activeAccountId,
  });

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId as string,
      accountId,
    },
  });
});

const enforceAuthedUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  await assertBetterAuthUserIsActive(ctx.userId);

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const requireRole = (...roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    if (
      ctx.systemRole !== "PLATFORM_ADMIN" &&
      !roles.includes(ctx.systemRole ?? "")
    ) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next({ ctx });
  });

export const requireWarehousePermission = (
  warehouseId: string,
  ...perms: ("PICK" | "PACK" | "RECEIVE")[]
) =>
  t.middleware(({ ctx, next }) => {
    const { systemRole, managedWarehouseIds, warehouseAssignments } = ctx;

    if (
      systemRole === "PLATFORM_ADMIN" ||
      systemRole === "THREEPL_ACCOUNT_OWNER"
    ) {
      return next({ ctx });
    }

    if (
      systemRole === "WAREHOUSE_MANAGER" &&
      managedWarehouseIds.includes(warehouseId)
    ) {
      return next({ ctx });
    }

    if (systemRole === "WAREHOUSE_STAFF") {
      const assignment = warehouseAssignments.find(
        (a) => a.warehouseId === warehouseId,
      );
      const hasAll = perms.every((p) => assignment?.permissions.includes(p));
      if (hasAll) {
        return next({ ctx });
      }
    }

    throw new TRPCError({ code: "FORBIDDEN" });
  });

export const requireCapability = (capability: SystemCapability) =>
  t.middleware(({ ctx, next }) => {
    const warehousePermissions = ctx.warehouseAssignments.flatMap((a) =>
      a.permissions.filter(
        (p): p is "PICK" | "PACK" | "RECEIVE" =>
          p === "PICK" || p === "PACK" || p === "RECEIVE",
      ),
    );

    if (
      !hasSystemCapability(ctx.systemRole, capability, {
        warehousePermissions: [...new Set(warehousePermissions)],
        merchantPermissions: ctx.merchantPermissions as (
          | "READ"
          | "WRITE"
          | "BILLING"
        )[],
      })
    ) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next({ ctx });
  });

export const requireMerchantPermission = (
  ...perms: ("READ" | "WRITE" | "BILLING")[]
) =>
  t.middleware(({ ctx, next }) => {
    const { systemRole, merchantPermissions } = ctx;

    if (
      systemRole === "PLATFORM_ADMIN" ||
      systemRole === "THREEPL_ACCOUNT_OWNER"
    ) {
      return next({ ctx });
    }

    if (systemRole === "MERCHANT_OWNER") {
      return next({ ctx });
    }

    if (systemRole === "MERCHANT_USER") {
      const hasAll = perms.every((p) => merchantPermissions.includes(p));
      if (hasAll) {
        return next({ ctx });
      }
    }

    throw new TRPCError({ code: "FORBIDDEN" });
  });

export const router = t.router;
export const publicProc = t.procedure;
export const protectedProc = t.procedure
  .use(enforcePlatformReadOnlySupport)
  .use(enforceLinkedTenant)
  .use(recordMutationAudit);
export const authedProc = t.procedure
  .use(enforceAuthedUser)
  .use(recordMutationAudit);

export const createTRPCRouter = router;
export const baseProcedure = publicProc;
export const createCallerFactory = t.createCallerFactory;

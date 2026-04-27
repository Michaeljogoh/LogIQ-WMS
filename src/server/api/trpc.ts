import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseWarehouseAssignments } from "@/server/helpers/warehouse-assignments";

type SessionUser = {
  id: string;
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

  return {
    db,
    req: opts.req,
    session,
    userId: user?.id ?? null,
    accountId: user?.accountId ?? null,
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

const enforceLinkedTenant = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.accountId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      accountId: ctx.accountId,
    },
  });
});

const enforceAuthedUser = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

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
export const protectedProc = t.procedure.use(enforceLinkedTenant);
export const authedProc = t.procedure.use(enforceAuthedUser);

export const createTRPCRouter = router;
export const baseProcedure = publicProc;
export const createCallerFactory = t.createCallerFactory;

import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseWarehouseAssignments } from "@/server/helpers/warehouse-assignments";

export const createTRPCContext = async (opts: { req: Request }) => {
  const session = await auth.api.getSession({ headers: opts.req.headers });
  const warehouseAssignments = parseWarehouseAssignments(
    (session as any)?.user?.warehouseAssignments,
  );

  return {
    db,
    userId: (session as any)?.user?.id ?? null,
    accountId: (session as any)?.user?.accountId ?? null,
    systemRole: (session as any)?.user?.systemRole ?? null,
    managedWarehouseIds: ((session as any)?.user?.managedWarehouseIds ??
      []) as string[],
    warehouseAssignments,
    merchantId: (session as any)?.user?.merchantId ?? null,
    merchantPermissions: ((session as any)?.user?.merchantPermissions ??
      []) as string[],
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

const enforceAuth = t.middleware(({ ctx, next }) => {
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

export const requireRole = (...roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    if (
      ctx.systemRole !== "platform_admin" &&
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

    if (systemRole === "platform_admin" || systemRole === "OPERATOR_OWNER") {
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

    if (systemRole === "platform_admin" || systemRole === "OPERATOR_OWNER") {
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
export const protectedProc = t.procedure.use(enforceAuth);

// Backward-compatible aliases for the existing app router scaffolding.
export const createTRPCRouter = router;
export const baseProcedure = publicProc;
export const createCallerFactory = t.createCallerFactory;

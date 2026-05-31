import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import type { PrismaClient, WarehousePermission } from "@/generated/prisma/client";
import { revokeBetterAuthSessions } from "@/lib/revoke-sessions";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

const staffPermissionSchema = z.array(z.enum(["PICK", "PACK", "RECEIVE"]));

function assertCanManageWarehouse(params: {
  systemRole: string | null;
  managedWarehouseIds: string[];
  warehouseId: string;
}) {
  if (
    params.systemRole === "PLATFORM_ADMIN" ||
    params.systemRole === "THREEPL_ACCOUNT_OWNER"
  ) {
    return;
  }
  if (
    params.systemRole === "WAREHOUSE_MANAGER" &&
    params.managedWarehouseIds.includes(params.warehouseId)
  ) {
    return;
  }
  throw new TRPCError({ code: "FORBIDDEN" });
}

function assertManagerPermissions(
  systemRole: string | null,
  permissions: ("PICK" | "PACK" | "RECEIVE")[],
) {
  if (systemRole !== "WAREHOUSE_MANAGER") {
    return;
  }
  const invalid = permissions.filter((p) => p !== "PICK" && p !== "RECEIVE");
  if (invalid.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Warehouse managers can only assign Pick and Receive permissions.",
    });
  }
}

async function assertCanManageStaffMember(
  db: PrismaClient,
  params: {
    accountId: string;
    accountUserId: string;
    systemRole: string | null;
  },
) {
  const staff = await db.accountUser.findFirst({
    where: {
      id: params.accountUserId,
      accountId: params.accountId,
      systemRole: "WAREHOUSE_STAFF",
    },
    select: { id: true },
  });
  if (!staff) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Warehouse staff member not found.",
    });
  }
  if (
    params.systemRole !== "WAREHOUSE_MANAGER" &&
    params.systemRole !== "THREEPL_ACCOUNT_OWNER" &&
    params.systemRole !== "PLATFORM_ADMIN"
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

const staffAssignRoles = requireRole(
  "THREEPL_ACCOUNT_OWNER",
  "WAREHOUSE_MANAGER",
  "PLATFORM_ADMIN",
);

export const warehouseStaffRouter = createTRPCRouter({
  listTeam: protectedProc.use(staffAssignRoles).query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    const isManager = ctx.systemRole === "WAREHOUSE_MANAGER";
    const managedIds = ctx.managedWarehouseIds;

    const users = await ctx.db.accountUser.findMany({
      where: {
        accountId,
        systemRole: "WAREHOUSE_STAFF",
      },
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        warehouseAssignments: {
          ...(isManager
            ? { where: { warehouseId: { in: managedIds } } }
            : {}),
          select: {
            id: true,
            warehouseId: true,
            permissions: true,
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      displayName:
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email,
      assignments: u.warehouseAssignments.map((a) => ({
        id: a.id,
        warehouseId: a.warehouseId,
        warehouseName: a.warehouse.name,
        warehouseCode: a.warehouse.code,
        permissions: a.permissions,
      })),
    }));
  }),

  listForUser: protectedProc
    .use(staffAssignRoles)
    .input(z.object({ accountUserId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      await assertCanManageStaffMember(ctx.db, {
        accountId,
        accountUserId: input.accountUserId,
        systemRole: ctx.systemRole,
      });

      const isManager = ctx.systemRole === "WAREHOUSE_MANAGER";
      const managedIds = ctx.managedWarehouseIds;

      const rows = await ctx.db.warehouseStaffAssignment.findMany({
        where: {
          userId: input.accountUserId,
          accountId,
          ...(isManager ? { warehouseId: { in: managedIds } } : {}),
        },
      });

      const warehouses = await ctx.db.warehouse.findMany({
        where: {
          id: { in: rows.map((r) => r.warehouseId) },
          accountId,
        },
        select: { id: true, name: true, code: true },
      });
      const wh = new Map(warehouses.map((w) => [w.id, w]));
      return rows.map((r) => {
        const w = wh.get(r.warehouseId);
        return {
          id: r.id,
          permissions: r.permissions,
          warehouseId: r.warehouseId,
          warehouseName: w?.name ?? "",
          warehouseCode: w?.code ?? "",
        };
      });
    }),

  assign: protectedProc
    .use(staffAssignRoles)
    .input(
      z.object({
        accountUserId: z.string(),
        warehouseId: z.string(),
        permissions: staffPermissionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      assertManagerPermissions(ctx.systemRole, input.permissions);
      assertCanManageWarehouse({
        systemRole: ctx.systemRole,
        managedWarehouseIds: ctx.managedWarehouseIds,
        warehouseId: input.warehouseId,
      });
      await assertCanManageStaffMember(ctx.db, {
        accountId,
        accountUserId: input.accountUserId,
        systemRole: ctx.systemRole,
      });

      if (input.permissions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one permission.",
        });
      }

      const warehouse = await ctx.db.warehouse.findFirst({
        where: { id: input.warehouseId, accountId },
      });
      if (!warehouse) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const staff = await ctx.db.accountUser.findFirst({
        where: {
          id: input.accountUserId,
          accountId,
          systemRole: "WAREHOUSE_STAFF",
        },
      });
      if (!staff) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "User must have warehouse staff role.",
        });
      }

      const assigner = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
      });
      if (!assigner) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Assigner profile missing.",
        });
      }

      await ctx.db.warehouseStaffAssignment.upsert({
        where: {
          userId_warehouseId: {
            userId: input.accountUserId,
            warehouseId: input.warehouseId,
          },
        },
        create: {
          accountId,
          userId: input.accountUserId,
          warehouseId: input.warehouseId,
          permissions: input.permissions as WarehousePermission[],
          assignedBy: assigner.id,
        },
        update: {
          permissions: input.permissions as WarehousePermission[],
          assignedBy: assigner.id,
        },
      });

      await revokeBetterAuthSessions(staff.betterAuthUserId);

      return { ok: true as const };
    }),

  update: protectedProc
    .use(staffAssignRoles)
    .input(
      z.object({
        accountUserId: z.string(),
        warehouseId: z.string(),
        permissions: staffPermissionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      assertManagerPermissions(ctx.systemRole, input.permissions);
      assertCanManageWarehouse({
        systemRole: ctx.systemRole,
        managedWarehouseIds: ctx.managedWarehouseIds,
        warehouseId: input.warehouseId,
      });
      await assertCanManageStaffMember(ctx.db, {
        accountId,
        accountUserId: input.accountUserId,
        systemRole: ctx.systemRole,
      });

      if (input.permissions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one permission.",
        });
      }

      const existing = await ctx.db.warehouseStaffAssignment.findFirst({
        where: {
          userId: input.accountUserId,
          warehouseId: input.warehouseId,
          accountId,
        },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const assigner = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
      });
      if (!assigner) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Assigner profile missing.",
        });
      }

      await ctx.db.warehouseStaffAssignment.update({
        where: { id: existing.id },
        data: {
          permissions: input.permissions as WarehousePermission[],
          assignedBy: assigner.id,
        },
      });

      const staff = await ctx.db.accountUser.findUnique({
        where: { id: input.accountUserId },
      });
      if (staff?.betterAuthUserId) {
        await revokeBetterAuthSessions(staff.betterAuthUserId);
      }

      return { ok: true as const };
    }),
});

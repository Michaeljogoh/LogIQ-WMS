import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import type { WarehousePermission } from "@/generated/prisma/client";
import { revokeBetterAuthSessions } from "@/lib/revoke-sessions";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

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

export const warehouseStaffRouter = createTRPCRouter({
  listForUser: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(z.object({ accountUserId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const rows = await ctx.db.warehouseStaffAssignment.findMany({
        where: {
          userId: input.accountUserId,
          accountId,
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
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        accountUserId: z.string(),
        warehouseId: z.string(),
        permissions: z.array(z.enum(["PICK", "PACK", "RECEIVE"])),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      assertCanManageWarehouse({
        systemRole: ctx.systemRole,
        managedWarehouseIds: ctx.managedWarehouseIds,
        warehouseId: input.warehouseId,
      });

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
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        accountUserId: z.string(),
        warehouseId: z.string(),
        permissions: z.array(z.enum(["PICK", "PACK", "RECEIVE"])),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);
      assertCanManageWarehouse({
        systemRole: ctx.systemRole,
        managedWarehouseIds: ctx.managedWarehouseIds,
        warehouseId: input.warehouseId,
      });

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

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import {
  formatSystemRoleLabel,
  inviteTeamMember,
  isInvitableOperatorRole,
} from "@/server/helpers/team-invite";

const inviteInputSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(2),
    systemRole: z.enum(["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"]),
    warehouseIds: z.array(z.string()).min(1),
    permissions: z
      .array(z.enum(["PICK", "PACK", "RECEIVE"]))
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (
      data.systemRole === "WAREHOUSE_STAFF" &&
      data.permissions.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one permission for warehouse staff.",
        path: ["permissions"],
      });
    }
  });

export const accountUserRouter = createTRPCRouter({
  list: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const users = await ctx.db.accountUser.findMany({
        where: { accountId },
        orderBy: { email: "asc" },
        select: {
          id: true,
          email: true,
          systemRole: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          managedWarehouses: {
            select: {
              warehouse: { select: { id: true, name: true, code: true } },
            },
          },
          warehouseAssignments: {
            select: {
              permissions: true,
              warehouse: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });

      return users.map((u) => ({
        id: u.id,
        email: u.email,
        systemRole: u.systemRole,
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: u.createdAt,
        roleLabel: formatSystemRoleLabel(u.systemRole),
        warehouses:
          u.systemRole === "WAREHOUSE_MANAGER"
            ? u.managedWarehouses.map((m) => m.warehouse)
            : u.warehouseAssignments.map((a) => a.warehouse),
        permissions:
          u.systemRole === "WAREHOUSE_STAFF"
            ? [
                ...new Set(
                  u.warehouseAssignments.flatMap((a) => a.permissions),
                ),
              ]
            : [],
      }));
    }),

  invite: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .input(inviteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { accountId, userId } = requireLinkedTenant(ctx);

      if (!isInvitableOperatorRole(input.systemRole)) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const inviter = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
      });
      if (!inviter) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Your operator profile is not linked.",
        });
      }

      const result = await inviteTeamMember({
        accountId,
        inviterAccountUserId: inviter.id,
        email: input.email,
        name: input.name,
        systemRole: input.systemRole,
        warehouseIds: input.warehouseIds,
        permissions: input.permissions,
      });

      return { ok: true as const, accountUserId: result.accountUserId };
    }),
});

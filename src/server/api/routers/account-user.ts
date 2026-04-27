import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

export const accountUserRouter = createTRPCRouter({
  list: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .query(async ({ ctx }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.accountUser.findMany({
        where: { accountId },
        orderBy: { email: "asc" },
        select: {
          id: true,
          email: true,
          systemRole: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });
    }),
});

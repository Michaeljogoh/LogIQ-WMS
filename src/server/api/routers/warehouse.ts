import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

export const warehouseRouter = createTRPCRouter({
  list: protectedProc.query(async ({ ctx }) => {
    const { accountId } = requireLinkedTenant(ctx);
    return ctx.db.warehouse.findMany({
      where: { accountId },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProc
    .use(requireRole("THREEPL_ACCOUNT_OWNER", "PLATFORM_ADMIN"))
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        addressLine1: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zip: z.string().min(1),
        country: z.string().min(1).optional(),
        timezone: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.warehouse.create({
        data: {
          accountId,
          name: input.name,
          code: input.code,
          addressLine1: input.addressLine1,
          city: input.city,
          state: input.state,
          zip: input.zip,
          country: input.country ?? "US",
          timezone: input.timezone ?? "America/Los_Angeles",
        },
      });
    }),
});

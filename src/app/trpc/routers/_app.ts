import { z } from "zod";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { accountUserRouter } from "@/server/api/routers/account-user";
import { alertsRouter } from "@/server/api/routers/alerts";
import { cycleCountRouter } from "@/server/api/routers/cycle-count";
import { merchantRouter } from "@/server/api/routers/merchant";
import { merchantUserRouter } from "@/server/api/routers/merchant-user";
import { purchaseOrderRouter } from "@/server/api/routers/purchase-order";
import { productRouter } from "@/server/api/routers/product";
import { stockLevelRouter } from "@/server/api/routers/stock-level";
import { supplierRouter } from "@/server/api/routers/supplier";
import { warehouseRouter } from "@/server/api/routers/warehouse";
import { warehouseStaffRouter } from "@/server/api/routers/warehouse-staff";
import { workOrderRouter } from "@/server/api/routers/work-order";
import {
  authedProc,
  baseProcedure,
  createTRPCRouter,
  protectedProc,
  requireRole,
} from "../init";
import { postRouter } from "./post";

export const appRouter = createTRPCRouter({
  post: postRouter,
  accountUser: accountUserRouter,
  merchant: merchantRouter,
  merchantUser: merchantUserRouter,
  warehouse: warehouseRouter,
  warehouseStaff: warehouseStaffRouter,
  product: productRouter,
  stockLevel: stockLevelRouter,
  cycleCount: cycleCountRouter,
  alerts: alertsRouter,
  supplier: supplierRouter,
  purchaseOrder: purchaseOrderRouter,
  workOrder: workOrderRouter,
  session: authedProc.query(async ({ ctx }) => {
    return ctx.session;
  }),
  operatorProfile: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .query(async ({ ctx }) => {
      const { userId } = requireLinkedTenant(ctx);
      const profile = await ctx.db.accountUser.findUnique({
        where: { betterAuthUserId: userId },
      });
      if (!profile) {
        return null;
      }
      const account = await ctx.db.logiqAccount.findUnique({
        where: { id: profile.accountId },
        select: { id: true, name: true, slug: true, plan: true },
      });
      return { profile, account };
    }),
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
});

export type AppRouter = typeof appRouter;

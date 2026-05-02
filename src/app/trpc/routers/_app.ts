import { z } from "zod";
import { requireLinkedTenant } from "@/server/api/ctx-ids";
import { accountUserRouter } from "@/server/api/routers/account-user";
import { alertsRouter } from "@/server/api/routers/alerts";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { cycleCountRouter } from "@/server/api/routers/cycle-count";
import { integrationRouter } from "@/server/api/routers/integration";
import { invoiceRouter } from "@/server/api/routers/invoice";
import { labelRouter } from "@/server/api/routers/label";
import { labelTemplateRouter } from "@/server/api/routers/label-template";
import { merchantRouter } from "@/server/api/routers/merchant";
import { merchantUserRouter } from "@/server/api/routers/merchant-user";
import {
  escalationRouter,
  notificationsRouter,
} from "@/server/api/routers/notification";
import { orderRouter } from "@/server/api/routers/order";
import { packagingRouter } from "@/server/api/routers/packaging";
import { pickListRouter } from "@/server/api/routers/pick-list";
import { printQueueRouter } from "@/server/api/routers/print-queue";
import { printerRouter } from "@/server/api/routers/printer";
import { productRouter } from "@/server/api/routers/product";
import { purchaseOrderRouter } from "@/server/api/routers/purchase-order";
import { routingRouter } from "@/server/api/routers/routing";
import { shipmentRouter } from "@/server/api/routers/shipment";
import { stockLevelRouter } from "@/server/api/routers/stock-level";
import { supplierRouter } from "@/server/api/routers/supplier";
import { transferRouter } from "@/server/api/routers/transfer";
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
  notifications: notificationsRouter,
  escalation: escalationRouter,
  notification: notificationsRouter,
  warehouse: warehouseRouter,
  warehouseStaff: warehouseStaffRouter,
  product: productRouter,
  stockLevel: stockLevelRouter,
  cycleCount: cycleCountRouter,
  alerts: alertsRouter,
  analytics: analyticsRouter,
  supplier: supplierRouter,
  purchaseOrder: purchaseOrderRouter,
  workOrder: workOrderRouter,
  order: orderRouter,
  pickList: pickListRouter,
  packaging: packagingRouter,
  printQueue: printQueueRouter,
  printer: printerRouter,
  shipment: shipmentRouter,
  routing: routingRouter,
  transfer: transferRouter,
  integration: integrationRouter,
  invoice: invoiceRouter,
  labelTemplate: labelTemplateRouter,
  label: labelRouter,
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

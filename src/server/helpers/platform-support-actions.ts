import "server-only";

import { TRPCError } from "@trpc/server";
import type { EscalatedSupportAction } from "@/lib/platform-support";
import { db } from "@/lib/db";
import { enqueueIntegrationSyncJob } from "@/server/jobs/integration-sync";
import { dispatchOutboundWebhook } from "@/server/integrations/svix-events";
import { tenantAccountListWhere } from "@/server/helpers/resolve-tenant-account";

export async function executeEscalatedSupportAction(params: {
  accountId: string;
  action: EscalatedSupportAction;
  targetId: string;
}): Promise<{ message: string }> {
  const accountWhere = { id: params.accountId, ...tenantAccountListWhere() };

  switch (params.action) {
    case "UNLOCK_STUCK_SHIPMENT": {
      const shipment = await db.shipment.findFirst({
        where: {
          id: params.targetId,
          account: accountWhere,
        },
        select: { id: true, status: true },
      });
      if (!shipment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shipment not found" });
      }
      if (shipment.status !== "EXCEPTION") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Shipment is not in EXCEPTION status",
        });
      }
      await db.shipment.update({
        where: { id: shipment.id },
        data: { status: "LABEL_CREATED" },
      });
      return { message: "Shipment unlocked — status reset to LABEL_CREATED" };
    }

    case "REQUEUE_WEBHOOK": {
      const endpoint = await db.webhookEndpoint.findFirst({
        where: {
          id: params.targetId,
          account: accountWhere,
          isActive: true,
        },
        select: { id: true, accountId: true },
      });
      if (!endpoint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook endpoint not found",
        });
      }
      await dispatchOutboundWebhook({
        accountId: endpoint.accountId,
        eventType: "logiqwms.shipment.label_created",
        payload: {
          supportRequeue: true,
          endpointId: endpoint.id,
          at: new Date().toISOString(),
        },
      });
      return { message: "Test webhook event dispatched to endpoint" };
    }

    case "REGENERATE_LABEL": {
      const shipment = await db.shipment.findFirst({
        where: {
          id: params.targetId,
          account: accountWhere,
        },
        select: { id: true, labelUrl: true },
      });
      if (!shipment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shipment not found" });
      }
      await db.shipment.update({
        where: { id: shipment.id },
        data: {
          labelUrl: null,
          status: "LABEL_CREATED",
        },
      });
      return {
        message:
          "Label cleared for regeneration — operator must purchase a new label",
      };
    }

    case "RETRY_SYNC": {
      const integration = await db.integration.findFirst({
        where: {
          id: params.targetId,
          account: accountWhere,
          status: "CONNECTED",
        },
        select: { id: true },
      });
      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connected integration not found",
        });
      }
      await enqueueIntegrationSyncJob({
        integrationId: integration.id,
        trigger: "manual",
      });
      return { message: "Integration sync job started" };
    }

    default: {
      const _exhaustive: never = params.action;
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown action: ${_exhaustive}`,
      });
    }
  }
}

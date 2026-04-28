import { handleIntegrationWebhook } from "@/app/api/webhooks/_integration";

export async function POST(request: Request) {
  return handleIntegrationWebhook({ request, type: "BIGCOMMERCE" });
}

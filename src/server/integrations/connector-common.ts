import type { IntegrationType } from "@/generated/prisma/client";

export type ConnectorOrderPayload = {
  id: string;
  lines: Array<{ sku: string; quantity: number }>;
  shippingAddress: {
    name: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  updatedAtIso: string;
};

export type ConnectorClient = {
  getOAuthUrl: (redirectUri: string, state: string) => string;
  exchangeCodeForToken: (
    code: string,
    redirectUri: string,
  ) => Promise<Record<string, unknown>>;
  fetchOrders: (
    credentials: Record<string, unknown>,
  ) => Promise<ConnectorOrderPayload[]>;
  pushTracking: (args: {
    credentials: Record<string, unknown>;
    channelOrderId: string;
    trackingNumber: string;
    carrier: string;
    service?: string | null;
  }) => Promise<void>;
};

export function createOAuthUrl(base: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return `${base}?${query.toString()}`;
}

export function parseTokenResponse(
  type: IntegrationType,
  code: string,
): Record<string, unknown> {
  return {
    accessToken: `${type.toLowerCase()}_token_${code.slice(0, 8)}`,
    refreshToken: `${type.toLowerCase()}_refresh_${Date.now()}`,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
}

export async function fetchOrdersStub(
  type: IntegrationType,
): Promise<ConnectorOrderPayload[]> {
  return [
    {
      id: `${type.toLowerCase()}_${Date.now()}`,
      lines: [{ sku: "DEMO-SKU-1", quantity: 1 }],
      shippingAddress: {
        name: "Sample Customer",
        street1: "123 Demo Street",
        city: "San Francisco",
        state: "CA",
        zip: "94103",
        country: "US",
      },
      updatedAtIso: new Date().toISOString(),
    },
  ];
}

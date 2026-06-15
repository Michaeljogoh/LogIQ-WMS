import {
  createOAuthUrl,
  fetchOrdersStub,
  parseTokenResponse,
} from "./connector-common";

export function normalizeShopifyShopDomain(input: string): string {
  let shop = input.trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, "");
  shop = shop.replace(/\/.*$/, "");
  if (!shop.includes(".")) {
    shop = `${shop}.myshopify.com`;
  }
  return shop;
}

export const shopifyConnector = {
  getOAuthUrl(redirectUri: string, state: string, shopDomain?: string) {
    if (!shopDomain) {
      throw new Error("A Shopify shop domain is required.");
    }
    const shop = normalizeShopifyShopDomain(shopDomain);
    return createOAuthUrl(`https://${shop}/admin/oauth/authorize`, {
      client_id: process.env.SHOPIFY_API_KEY ?? "missing-shopify-client-id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "read_orders,write_fulfillments",
      state,
    });
  },

  async exchangeCodeForToken(
    code: string,
    _redirectUri: string,
    shopDomain?: string,
  ) {
    const tokens = parseTokenResponse("SHOPIFY", code);
    if (!shopDomain) {
      return tokens;
    }
    return {
      ...tokens,
      shopDomain: normalizeShopifyShopDomain(shopDomain),
    };
  },

  async fetchOrders() {
    return fetchOrdersStub("SHOPIFY");
  },

  async pushTracking() {
    // Placeholder for POST /orders/{id}/fulfillments call.
  },
};

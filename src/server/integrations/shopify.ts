import {
  createOAuthUrl,
  fetchOrdersStub,
  parseTokenResponse,
} from "./connector-common";

export const shopifyConnector = {
  getOAuthUrl(redirectUri: string, state: string) {
    return createOAuthUrl("https://accounts.shopify.com/oauth/authorize", {
      client_id: process.env.SHOPIFY_API_KEY ?? "missing-shopify-client-id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "read_orders,write_fulfillments",
      state,
    });
  },

  async exchangeCodeForToken(code: string) {
    return parseTokenResponse("SHOPIFY", code);
  },

  async fetchOrders() {
    return fetchOrdersStub("SHOPIFY");
  },

  async pushTracking() {
    // Placeholder for POST /orders/{id}/fulfillments call.
  },
};

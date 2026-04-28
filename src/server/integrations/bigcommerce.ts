import {
  createOAuthUrl,
  fetchOrdersStub,
  parseTokenResponse,
} from "./connector-common";

export const bigcommerceConnector = {
  getOAuthUrl(redirectUri: string, state: string) {
    return createOAuthUrl("https://login.bigcommerce.com/oauth2/authorize", {
      client_id:
        process.env.BIGCOMMERCE_CLIENT_ID ?? "missing-bigcommerce-client-id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "store_v2_orders",
      state,
    });
  },

  async exchangeCodeForToken(code: string) {
    return parseTokenResponse("BIGCOMMERCE", code);
  },

  async fetchOrders() {
    return fetchOrdersStub("BIGCOMMERCE");
  },

  async pushTracking() {
    // Placeholder for POST /v2/orders/{id}/shipments.
  },
};

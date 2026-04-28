import {
  createOAuthUrl,
  fetchOrdersStub,
  parseTokenResponse,
} from "./connector-common";

export const ebayConnector = {
  getOAuthUrl(redirectUri: string, state: string) {
    return createOAuthUrl("https://auth.ebay.com/oauth2/authorize", {
      client_id: process.env.EBAY_CLIENT_ID ?? "missing-ebay-client-id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
      state,
    });
  },

  async exchangeCodeForToken(code: string) {
    return parseTokenResponse("EBAY", code);
  },

  async fetchOrders() {
    return fetchOrdersStub("EBAY");
  },

  async pushTracking() {
    // Placeholder for eBay Fulfillment API pushback.
  },
};

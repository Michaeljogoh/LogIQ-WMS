import {
  createOAuthUrl,
  fetchOrdersStub,
  parseTokenResponse,
} from "./connector-common";

export const etsyConnector = {
  getOAuthUrl(redirectUri: string, state: string) {
    return createOAuthUrl("https://www.etsy.com/oauth/connect", {
      client_id: process.env.ETSY_CLIENT_ID ?? "missing-etsy-client-id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "transactions_r,transactions_w",
      state,
    });
  },

  async exchangeCodeForToken(code: string) {
    return parseTokenResponse("ETSY", code);
  },

  async fetchOrders() {
    return fetchOrdersStub("ETSY");
  },

  async pushTracking() {
    // Placeholder for Etsy tracking API update.
  },
};

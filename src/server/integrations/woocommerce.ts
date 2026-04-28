import {
  createOAuthUrl,
  fetchOrdersStub,
  parseTokenResponse,
} from "./connector-common";

export const woocommerceConnector = {
  getOAuthUrl(redirectUri: string, state: string) {
    return createOAuthUrl("https://woocommerce.com/connect", {
      redirect_uri: redirectUri,
      state,
    });
  },

  async exchangeCodeForToken(code: string) {
    return parseTokenResponse("WOOCOMMERCE", code);
  },

  async fetchOrders() {
    return fetchOrdersStub("WOOCOMMERCE");
  },

  async pushTracking() {
    // Placeholder for WooCommerce order status/tracking update.
  },
};

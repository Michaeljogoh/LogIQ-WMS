import {
  createOAuthUrl,
  fetchOrdersStub,
  parseTokenResponse,
} from "./connector-common";

export const tiktokShopConnector = {
  getOAuthUrl(redirectUri: string, state: string) {
    return createOAuthUrl("https://auth.tiktok-shops.com/oauth/authorize", {
      app_key: process.env.TIKTOK_SHOP_APP_KEY ?? "missing-tiktok-app-key",
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });
  },

  async exchangeCodeForToken(code: string) {
    return parseTokenResponse("TIKTOK_SHOP", code);
  },

  async fetchOrders() {
    return fetchOrdersStub("TIKTOK_SHOP");
  },

  async pushTracking() {
    // Placeholder for TikTok ship_package tracking pushback.
  },
};

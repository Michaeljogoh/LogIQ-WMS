export type IntegrationBrandId =
  | "shopify"
  | "woocommerce"
  | "amazon"
  | "tiktok"
  | "easypost"
  | "quickbooks"
  | "xero"
  | "slack";

export type IntegrationBrand = {
  id: IntegrationBrandId;
  name: string;
  src: string;
  color: string;
  width: number;
  height: number;
};

export const INTEGRATION_BRANDS: Record<IntegrationBrandId, IntegrationBrand> = {
  shopify: {
    id: "shopify",
    name: "Shopify",
    src: "/images/integrations/shopify.svg",
    color: "#95BF47",
    width: 96,
    height: 28,
  },
  woocommerce: {
    id: "woocommerce",
    name: "WooCommerce",
    src: "/images/integrations/woocommerce.svg",
    color: "#96588A",
    width: 128,
    height: 28,
  },
  amazon: {
    id: "amazon",
    name: "Amazon",
    src: "/images/integrations/amazon.svg",
    color: "#FF9900",
    width: 80,
    height: 28,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok Shop",
    src: "/images/integrations/tiktok.svg",
    color: "#EE1D52",
    width: 28,
    height: 28,
  },
  easypost: {
    id: "easypost",
    name: "EasyPost",
    src: "/images/integrations/easypost.svg",
    color: "#30B566",
    width: 108,
    height: 28,
  },
  quickbooks: {
    id: "quickbooks",
    name: "QuickBooks",
    src: "/images/integrations/quickbooks.svg",
    color: "#2CA01C",
    width: 28,
    height: 28,
  },
  xero: {
    id: "xero",
    name: "Xero",
    src: "/images/integrations/xero.svg",
    color: "#13B5EA",
    width: 28,
    height: 28,
  },
  slack: {
    id: "slack",
    name: "Slack",
    src: "/images/integrations/slack.svg",
    color: "#E01E5A",
    width: 88,
    height: 28,
  },
};

/** Logos shown in the social proof strip (above the fold). */
export const SOCIAL_PROOF_BRAND_IDS: IntegrationBrandId[] = [
  "shopify",
  "woocommerce",
  "amazon",
  "easypost",
  "quickbooks",
  "slack",
];

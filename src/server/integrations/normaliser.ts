export type NormalisedOrder = {
  channelOrderId: string;
  channel:
    | "SHOPIFY"
    | "WOOCOMMERCE"
    | "BIGCOMMERCE"
    | "ETSY"
    | "TIKTOK_SHOP"
    | "EBAY";
  merchantId: string;
  accountId: string;
  shippingName: string;
  shippingLine1: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  lines: Array<{
    sku: string;
    quantity: number;
  }>;
  slaHours?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normaliseOrder(input: {
  platform: NormalisedOrder["channel"];
  payload: unknown;
  accountId: string;
  merchantId: string;
  defaultSlaHours?: number;
}): NormalisedOrder {
  const record = asRecord(input.payload);
  const shipping = asRecord(record.shipping);
  const shippingAddress = asRecord(record.shippingAddress);
  const lineItems = Array.isArray(record.lines)
    ? record.lines
    : Array.isArray(record.lineItems)
      ? record.lineItems
      : [];

  const lines = lineItems
    .map((line): { sku: string; quantity: number } => {
      const lineRecord = asRecord(line);
      return {
        sku: asString(lineRecord.sku, asString(lineRecord.productSku, "")),
        quantity: Math.max(1, asNumber(lineRecord.quantity, 1)),
      };
    })
    .filter((line) => line.sku.length > 0);

  if (!lines.length) {
    throw new Error(
      "No valid line items were provided for order normalisation.",
    );
  }

  return {
    channelOrderId: asString(
      record.channelOrderId,
      asString(record.id, cryptoRandomOrderId()),
    ),
    channel: input.platform,
    merchantId: input.merchantId,
    accountId: input.accountId,
    shippingName: asString(
      shipping.name,
      asString(shippingAddress.name, "Customer"),
    ),
    shippingLine1: asString(
      shipping.line1,
      asString(shippingAddress.street1, "Unknown Address"),
    ),
    shippingCity: asString(
      shipping.city,
      asString(shippingAddress.city, "Unknown"),
    ),
    shippingState: asString(
      shipping.state,
      asString(shippingAddress.state, "NA"),
    ),
    shippingZip: asString(shipping.zip, asString(shippingAddress.zip, "00000")),
    shippingCountry: asString(
      shipping.country,
      asString(shippingAddress.country, "US"),
    ),
    lines,
    slaHours: input.defaultSlaHours,
  };
}

export function normaliseWebhookPayload(
  platform: string,
  body: unknown,
): unknown {
  return {
    platform,
    payload: body,
  };
}

function cryptoRandomOrderId() {
  return `order_${Math.random().toString(36).slice(2, 12)}`;
}

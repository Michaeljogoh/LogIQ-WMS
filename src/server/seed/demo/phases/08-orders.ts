import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt, seqRef } from "../helpers";
import type { SeedContext } from "../types";

type OrderSpec = {
  merchantId: string;
  warehouseId: string;
  channel: string;
  orderStatus: "PENDING" | "ON_HOLD" | "CANCELLED";
  fulfillmentStatus: "UNFULFILLED" | "PARTIALLY_FULFILLED" | "FULFILLED";
  productIds: string[];
  daysAgoCreated: number;
  shippingState: string;
};

const US_STATES = ["CA", "NY", "TX", "FL", "IL", "OH", "PA", "GA", "WA", "CO"];
const FIRST_NAMES = [
  "James",
  "Emma",
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "William",
  "Sophia",
  "Benjamin",
  "Isabella",
  "Lucas",
  "Mia",
  "Mason",
  "Charlotte",
  "Ethan",
  "Amelia",
  "Alexander",
  "Harper",
  "Henry",
  "Evelyn",
];
const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Martinez",
  "Wilson",
  "Anderson",
  "Taylor",
  "Thomas",
  "Hernandez",
  "Moore",
  "Martin",
  "Jackson",
  "Thompson",
  "White",
  "Lopez",
];

function randomName(): string {
  return `${FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[randInt(0, LAST_NAMES.length - 1)]}`;
}

function randomAddress(state: string): {
  line1: string;
  city: string;
  zip: string;
} {
  const cities: Record<string, { city: string; zip: string }> = {
    CA: { city: "Los Angeles", zip: "90001" },
    NY: { city: "New York", zip: "10001" },
    TX: { city: "Houston", zip: "77001" },
    FL: { city: "Miami", zip: "33101" },
    IL: { city: "Chicago", zip: "60601" },
    OH: { city: "Columbus", zip: "43201" },
    PA: { city: "Philadelphia", zip: "19101" },
    GA: { city: "Atlanta", zip: "30301" },
    WA: { city: "Seattle", zip: "98101" },
    CO: { city: "Denver", zip: "80201" },
  };
  const c = cities[state] ?? { city: "Springfield", zip: "62701" };
  return { line1: `${randInt(100, 9999)} Main St`, city: c.city, zip: c.zip };
}

export async function seedOrders(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const allProductIds = [
    ...ctx.apexProductIds,
    ...ctx.novatechProductIds,
    ...ctx.lumiereProductIds,
  ];

  const specs: OrderSpec[] = [];

  const merchants = [ctx.apexId, ctx.novatechId, ctx.lumiereId];
  const merchantsProducts = [
    ctx.apexProductIds,
    ctx.novatechProductIds,
    ctx.lumiereProductIds,
  ];
  const channels = ["SHOPIFY", "WOOCOMMERCE", "MANUAL"];

  // 30 FULFILLED orders spread over last 60 days
  for (let i = 0; i < 30; i++) {
    const merchantIdx = i % 3;
    const merchantId = merchants[merchantIdx] ?? ctx.apexId;
    const merchantProducts =
      merchantsProducts[merchantIdx] ?? ctx.apexProductIds;
    specs.push({
      merchantId,
      warehouseId: ctx.laxId,
      channel: channels[merchantIdx % channels.length] ?? "SHOPIFY",
      orderStatus: "PENDING",
      fulfillmentStatus: "FULFILLED",
      productIds: merchantProducts.slice(0, randInt(1, 3)),
      daysAgoCreated: randInt(3, 60),
      shippingState: US_STATES[i % US_STATES.length] ?? "CA",
    });
  }

  // 15 UNFULFILLED PENDING orders (recent)
  for (let i = 0; i < 15; i++) {
    const merchantIdx = i % 3;
    const merchantId = merchants[merchantIdx] ?? ctx.apexId;
    const merchantProducts =
      merchantsProducts[merchantIdx] ?? ctx.apexProductIds;
    specs.push({
      merchantId,
      warehouseId: ctx.laxId,
      channel: "SHOPIFY",
      orderStatus: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      productIds: merchantProducts.slice(0, randInt(1, 3)),
      daysAgoCreated: randInt(0, 3),
      shippingState: US_STATES[i % US_STATES.length] ?? "CA",
    });
  }

  // 5 PARTIALLY_FULFILLED
  for (let i = 0; i < 5; i++) {
    specs.push({
      merchantId: ctx.apexId,
      warehouseId: ctx.laxId,
      channel: "SHOPIFY",
      orderStatus: "PENDING",
      fulfillmentStatus: "PARTIALLY_FULFILLED",
      productIds: ctx.apexProductIds.slice(0, 2),
      daysAgoCreated: randInt(1, 5),
      shippingState: "CA",
    });
  }

  // 5 ON_HOLD
  const onHoldMerchants = [ctx.novatechId, ctx.lumiereId];
  const onHoldProducts = [ctx.novatechProductIds, ctx.lumiereProductIds];
  for (let i = 0; i < 5; i++) {
    specs.push({
      merchantId: onHoldMerchants[i % 2] ?? ctx.novatechId,
      warehouseId: ctx.laxId,
      channel: "MANUAL",
      orderStatus: "ON_HOLD",
      fulfillmentStatus: "UNFULFILLED",
      productIds: (onHoldProducts[i % 2] ?? []).slice(0, 1),
      daysAgoCreated: randInt(1, 7),
      shippingState: "TX",
    });
  }

  // 5 CANCELLED
  for (let i = 0; i < 5; i++) {
    specs.push({
      merchantId: ctx.lumiereId,
      warehouseId: ctx.laxId,
      channel: "WOOCOMMERCE",
      orderStatus: "CANCELLED",
      fulfillmentStatus: "UNFULFILLED",
      productIds: ctx.lumiereProductIds.slice(0, 1),
      daysAgoCreated: randInt(5, 30),
      shippingState: "NY",
    });
  }

  const orderIds: string[] = [];
  const fulfilledOrderIds: string[] = [];
  const unfulfilledOrderIds: string[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    if (!spec) continue;
    const addr = randomAddress(spec.shippingState);
    const createdAt = daysAgo(spec.daysAgoCreated);
    const dueAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

    const order = await db.order.create({
      data: {
        accountId: ctx.accountId,
        merchantId: spec.merchantId,
        warehouseId: spec.warehouseId,
        channelOrderId: seqRef(`ORD-${spec.channel.slice(0, 3)}`, i + 1, 4),
        channel: spec.channel,
        status: spec.orderStatus,
        fulfillmentStatus: spec.fulfillmentStatus,
        shippingName: randomName(),
        shippingLine1: addr.line1,
        shippingCity: addr.city,
        shippingState: spec.shippingState,
        shippingZip: addr.zip,
        shippingCountry: "US",
        slaHours: 48,
        dueAt,
        createdAt,
        updatedAt: createdAt,
      },
    });

    await db.orderLine.createMany({
      data: spec.productIds.map((productId) => ({
        orderId: order.id,
        productId,
        sku: allProductIds.includes(productId) ? productId : productId,
        quantity: randInt(1, 3),
        pickedQty: spec.fulfillmentStatus === "FULFILLED" ? randInt(1, 3) : 0,
        createdAt,
      })),
    });

    orderIds.push(order.id);
    if (spec.fulfillmentStatus === "FULFILLED") {
      fulfilledOrderIds.push(order.id);
    } else {
      unfulfilledOrderIds.push(order.id);
    }
  }

  return {
    ...ctx,
    orderIds,
    fulfilledOrderIds,
    unfulfilledOrderIds,
  };
}

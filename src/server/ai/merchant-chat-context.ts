import type { PrismaClient } from "@/generated/prisma/client";

export async function buildMerchantChatContext(
  db: PrismaClient,
  args: { accountId: string; merchantId: string },
): Promise<string> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    merchant,
    openOrders,
    shippedOrders,
    lowStock,
    recentInvoices,
    stockUnits,
  ] = await db.$transaction([
    db.merchant.findFirst({
      where: { id: args.merchantId, accountId: args.accountId },
      select: { name: true, email: true },
    }),
    db.order.count({
      where: {
        accountId: args.accountId,
        merchantId: args.merchantId,
        fulfillmentStatus: { not: "FULFILLED" },
        status: { not: "CANCELLED" },
      },
    }),
    db.order.count({
      where: {
        accountId: args.accountId,
        merchantId: args.merchantId,
        shipments: {
          some: {
            createdAt: { gte: weekAgo },
            status: { not: "VOIDED" },
          },
        },
      },
    }),
    db.product.findMany({
      where: {
        accountId: args.accountId,
        merchantId: args.merchantId,
        isActive: true,
        lowStockThreshold: { not: null },
      },
      select: {
        sku: true,
        name: true,
        lowStockThreshold: true,
        stockLevels: { select: { quantity: true, reservedQty: true } },
      },
      take: 25,
    }),
    db.invoice.findMany({
      where: { accountId: args.accountId, merchantId: args.merchantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        invoiceNumber: true,
        totalCents: true,
        status: true,
        periodStart: true,
        periodEnd: true,
      },
    }),
    db.stockLevel.aggregate({
      _sum: { quantity: true },
      where: {
        accountId: args.accountId,
        product: { merchantId: args.merchantId },
      },
    }),
  ]);

  const lowStockRows = lowStock
    .map((p) => {
      const qty = p.stockLevels.reduce((s, l) => s + l.quantity, 0);
      const res = p.stockLevels.reduce((s, l) => s + l.reservedQty, 0);
      const avail = qty - res;
      const th = p.lowStockThreshold ?? 0;
      return avail < th
        ? { sku: p.sku, name: p.name, available: avail, threshold: th }
        : null;
    })
    .filter(Boolean);

  return JSON.stringify(
    {
      merchant,
      snapshotGeneratedAt: now.toISOString(),
      openOrdersCount: openOrders,
      ordersWithShipmentLast7Days: shippedOrders,
      totalStockUnits: stockUnits._sum.quantity ?? 0,
      lowStockSkus: lowStockRows,
      recentInvoices,
    },
    null,
    2,
  );
}

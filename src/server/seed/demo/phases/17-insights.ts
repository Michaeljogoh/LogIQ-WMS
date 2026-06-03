import type { PrismaClient } from "../../../../generated/prisma/client";
import { daysAgo, randInt } from "../helpers";
import type { SeedContext } from "../types";

export async function seedInsights(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  // LogIQ Insights
  await db.logIQInsight.createMany({
    data: [
      {
        accountId: ctx.accountId,
        merchantId: ctx.novatechId,
        warehouseId: ctx.laxId,
        type: "STOCKOUT_RISK",
        severity: "CRITICAL",
        title: "NOVA-TWS-001 at stockout risk",
        body: "True Wireless Earbuds Pro has 28 units on hand with an average daily outbound of 7 units. At current velocity, stock will be depleted in 4 days.",
        data: {
          productId: ctx.novatechProductIds[0],
          daysOfStock: 4,
          avgDailyOutbound: 7,
          onHandQty: 28,
        },
        actionUrl: `/inventory/products/${ctx.novatechProductIds[0]}`,
        dedupeKey: `stockout_risk_${ctx.novatechProductIds[0]}`,
        createdAt: daysAgo(0),
      },
      {
        accountId: ctx.accountId,
        merchantId: ctx.novatechId,
        type: "BILLING_ANOMALY",
        severity: "WARNING",
        title: "Invoice INV-2024-005 has unusual storage charges",
        body: "Storage fee units (1,240) are 38% higher than the previous period average (897). Possible discrepancy in unit-day calculation.",
        data: {
          invoiceId: "INV-2024-005",
          expectedUnits: 897,
          actualUnits: 1240,
          variancePct: 38,
        },
        dedupeKey: "billing_anomaly_INV-2024-005",
        createdAt: daysAgo(1),
      },
      {
        accountId: ctx.accountId,
        merchantId: ctx.apexId,
        type: "SLA_BREACH_RISK",
        severity: "WARNING",
        title: "3 Apex Sportswear orders approaching SLA deadline",
        body: "3 orders created within the last 44 hours have not been picked yet. At current pick rate, they risk breaching the 48-hour fulfillment SLA.",
        data: { ordersAtRisk: 3, slaHours: 48, hoursRemaining: 4 },
        dedupeKey: "sla_risk_apex_batch_june",
        createdAt: daysAgo(0),
      },
      {
        accountId: ctx.accountId,
        type: "CARRIER_PERFORMANCE_CHANGE",
        severity: "INFO",
        title: "FedEx Ground on-time rate declined",
        body: "FedEx Ground on-time delivery rate dropped from 96.2% to 89.1% over the last 30 days. Consider shifting zone 5–7 shipments to UPS Ground.",
        data: {
          carrier: "FEDEX",
          service: "FedEx Ground",
          previousRate: 96.2,
          currentRate: 89.1,
          zones: [5, 6, 7],
        },
        acknowledgedAt: daysAgo(1),
        acknowledgedBy: ctx.ownerAccountUserId,
        dedupeKey: "carrier_perf_fedex_ground_june",
        createdAt: daysAgo(2),
      },
      {
        accountId: ctx.accountId,
        warehouseId: ctx.laxId,
        type: "CAPACITY_WARNING",
        severity: "WARNING",
        title: "LAX approaching storage capacity",
        body: "Los Angeles Fulfillment Center is at 84% bin utilization. At current inbound rate, capacity will be reached in approximately 12 days.",
        data: { warehouseCode: "LAX", utilizationPct: 84, daysToCapacity: 12 },
        dedupeKey: "capacity_lax_june",
        createdAt: daysAgo(0),
      },
    ],
  });

  // Carrier scorecards
  await db.carrierScorecard.createMany({
    data: [
      {
        accountId: ctx.accountId,
        carrier: "UPS",
        service: "UPS Ground",
        destinationZone: null,
        weightTier: "0-1lb",
        onTimeRate: 0.942,
        damageRate: 0.008,
        avgCostCents: 850,
        avgActualDays: 4.2,
        score: 87.5,
      },
      {
        accountId: ctx.accountId,
        carrier: "UPS",
        service: "UPS 2nd Day Air",
        destinationZone: null,
        weightTier: "0-1lb",
        onTimeRate: 0.978,
        damageRate: 0.004,
        avgCostCents: 1850,
        avgActualDays: 2.0,
        score: 94.1,
      },
      {
        accountId: ctx.accountId,
        carrier: "FEDEX",
        service: "FedEx Ground",
        destinationZone: null,
        weightTier: "0-1lb",
        onTimeRate: 0.891,
        damageRate: 0.012,
        avgCostCents: 820,
        avgActualDays: 4.8,
        score: 79.3,
      },
      {
        accountId: ctx.accountId,
        carrier: "FEDEX",
        service: "FedEx Express Saver",
        destinationZone: null,
        weightTier: "0-1lb",
        onTimeRate: 0.963,
        damageRate: 0.005,
        avgCostCents: 1650,
        avgActualDays: 3.0,
        score: 91.2,
      },
      {
        accountId: ctx.accountId,
        carrier: "USPS",
        service: "USPS Priority Mail",
        destinationZone: null,
        weightTier: "0-1lb",
        onTimeRate: 0.921,
        damageRate: 0.015,
        avgCostCents: 750,
        avgActualDays: 3.5,
        score: 83.4,
      },
      {
        accountId: ctx.accountId,
        carrier: "USPS",
        service: "USPS First Class",
        destinationZone: null,
        weightTier: "0-1lb",
        onTimeRate: 0.888,
        damageRate: 0.018,
        avgCostCents: 480,
        avgActualDays: 5.1,
        score: 76.2,
      },
      {
        accountId: ctx.accountId,
        carrier: "UPS",
        service: "UPS Ground",
        destinationZone: 5,
        weightTier: "1-5lb",
        onTimeRate: 0.935,
        damageRate: 0.009,
        avgCostCents: 1120,
        avgActualDays: 4.5,
        score: 85.8,
      },
      {
        accountId: ctx.accountId,
        carrier: "FEDEX",
        service: "FedEx Ground",
        destinationZone: 5,
        weightTier: "1-5lb",
        onTimeRate: 0.882,
        damageRate: 0.014,
        avgCostCents: 1080,
        avgActualDays: 5.0,
        score: 77.1,
      },
    ],
  });

  // Stock forecasts per product per warehouse
  const allProducts = [
    ...ctx.apexProductIds,
    ...ctx.novatechProductIds,
    ...ctx.lumiereProductIds,
  ];

  for (const productId of allProducts) {
    for (const warehouseId of [ctx.laxId, ctx.ordId]) {
      const onHandQty = randInt(30, 250);
      const avgDailyOutbound = Math.random() * 8 + 0.5;
      const daysRemaining = onHandQty / avgDailyOutbound;

      await db.stockForecast.create({
        data: {
          accountId: ctx.accountId,
          productId,
          warehouseId,
          onHandQty,
          avgDailyOutbound: Math.round(avgDailyOutbound * 10) / 10,
          daysOfStockRemaining: Math.round(daysRemaining * 10) / 10,
          stockoutRisk:
            daysRemaining < 7 ? 0.9 : daysRemaining < 14 ? 0.5 : 0.1,
          outboundSparkline: Array.from({ length: 14 }, () => randInt(0, 12)),
        },
      });
    }
  }

  // LogIQ queries (AI assistant history)
  await db.logIQQuery.createMany({
    data: [
      {
        accountId: ctx.accountId,
        userId: ctx.ownerAccountUserId,
        queryText: "Which SKUs are at risk of stocking out in the next 7 days?",
        explanation:
          "Found 3 products with less than 7 days of stock at current velocity",
        chartType: "table",
        sqlText:
          "SELECT p.sku, p.name, sf.days_of_stock_remaining FROM stock_forecast sf JOIN product p ON p.id = sf.product_id WHERE sf.days_of_stock_remaining < 7 ORDER BY sf.days_of_stock_remaining ASC",
        rowCount: 3,
        createdAt: daysAgo(1),
      },
      {
        accountId: ctx.accountId,
        userId: ctx.ownerAccountUserId,
        queryText: "Show carrier on-time performance for the last 30 days",
        explanation:
          "Compared on-time rates across UPS, FedEx, and USPS for delivered shipments",
        chartType: "bar",
        sqlText:
          "SELECT carrier, service, AVG(CASE WHEN on_time THEN 1.0 ELSE 0.0 END) as on_time_rate FROM carrier_performance_log WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY carrier, service ORDER BY on_time_rate DESC",
        rowCount: 6,
        createdAt: daysAgo(2),
      },
      {
        accountId: ctx.accountId,
        userId: ctx.ownerAccountUserId,
        queryText: "What are the top 10 most ordered SKUs this month?",
        explanation:
          "Ranked products by total quantity ordered in the current calendar month",
        chartType: "bar",
        sqlText:
          "SELECT p.sku, p.name, SUM(ol.quantity) as total_qty FROM order_line ol JOIN product p ON p.id = ol.product_id JOIN \"order\" o ON o.id = ol.order_id WHERE o.created_at >= DATE_TRUNC('month', NOW()) GROUP BY p.sku, p.name ORDER BY total_qty DESC LIMIT 10",
        rowCount: 10,
        createdAt: daysAgo(3),
      },
    ],
  });

  return ctx;
}

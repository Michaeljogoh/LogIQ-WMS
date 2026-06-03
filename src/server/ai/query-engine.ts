import { TRPCError } from "@trpc/server";
import { generateText } from "ai";
import type { PrismaClient } from "@/generated/prisma/client";
import { getGeminiModel } from "@/server/ai/client";
import { parseJsonObject } from "@/server/ai/parse-json-block";
import { assertTenantScopedSelect } from "@/server/ai/sql-guard";

const SYSTEM_PROMPT = `You are LogIQ, the AI data assistant for LogIQ WMS.
You generate read-only PostgreSQL SELECT queries for ONE tenant account.

The account id to scope every row is: {accountId}

Actual table names and key columns (PostgreSQL, quoted mixedCase columns):
- "product" ("id", "accountId", "merchantId", "name", "sku", "barcode", "deadStockDays", "lowStockThreshold")
- "stock_level" ("id", "accountId", "productId", "binId", "warehouseId", "quantity", "reservedQty")
- "stock_movement" ("id", "accountId", "productId", "warehouseId", "type", "quantityDelta", "createdAt")
- "order" ("id", "accountId", "merchantId", "warehouseId", "status", "fulfillmentStatus", "dueAt", "createdAt")
- "order_line" ("id", "orderId", "productId", "sku", "quantity", "pickedQty")
- "shipment" ("id", "accountId", "orderId", "carrier", "service", "rateCents", "status", "createdAt")
- "merchant" ("id", "accountId", "name", "email")
- "invoice" ("id", "accountId", "merchantId", "periodStart", "periodEnd", "totalCents", "status", "createdAt")
- "carrier_performance_log" ("id", "accountId", "carrier", "service", "onTime", "actualDays", "damaged", "rateCents", "createdAt")

RULES:
1. Only generate a single SELECT statement (no CTE abuse with writes; CTEs with SELECT-only are OK).
2. Every table reference MUST include WHERE "accountId" = '{accountId}' (join each table with its account filter).
3. Prefer explicit column lists; limit rows (e.g. LIMIT 500).
4. Return ONLY compact JSON on one line: {"sql": string | null, "chartType": "bar" | "line" | "table" | null, "explanation": string}
5. If you cannot answer safely: {"sql": null, "chartType": null, "explanation": "reason"}`;

export type NLQueryChartType = "bar" | "line" | "table" | null;

export type NLQueryResult = {
  explanation: string;
  chartType: NLQueryChartType;
  data: unknown[] | null;
};

export async function runNLQuery(
  db: PrismaClient,
  accountId: string,
  queryText: string,
  opts?: { warehouseIds?: string[] },
): Promise<NLQueryResult> {
  const model = getGeminiModel();
  if (!model) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Gemini API is not configured (GOOGLE_GENERATIVE_AI_API_KEY).",
    });
  }

  const scope =
    opts?.warehouseIds && opts.warehouseIds.length > 0
      ? `\nRestrict to these warehouse ids only: ${opts.warehouseIds.join(", ")}. Use the "warehouseId" column on stock_level, stock_movement, "order", and pick_list.`
      : "";

  const { text } = await generateText({
    model,
    system: `${SYSTEM_PROMPT.replaceAll("{accountId}", accountId)}${scope}`,
    messages: [{ role: "user", content: queryText }],
    maxOutputTokens: 1024,
  });

  let parsed: {
    sql: string | null;
    chartType: NLQueryChartType;
    explanation: string;
  };
  try {
    parsed = parseJsonObject(text);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Model returned invalid JSON.",
    });
  }

  if (!parsed.sql) {
    return {
      explanation: parsed.explanation,
      chartType: parsed.chartType ?? null,
      data: null,
    };
  }

  const safeSql = assertTenantScopedSelect(parsed.sql, accountId);
  const data = (await db.$queryRawUnsafe(safeSql)) as unknown[];
  return {
    explanation: parsed.explanation,
    chartType: parsed.chartType ?? null,
    data: Array.isArray(data) ? data : [data],
  };
}

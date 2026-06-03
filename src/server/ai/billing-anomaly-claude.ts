import { generateText } from "ai";
import { getGeminiModel } from "@/server/ai/client";
import { parseJsonObject } from "@/server/ai/parse-json-block";

export type ClaudeBillingFlag = {
  lineId?: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  type: string;
  description: string;
  expectedValue?: string;
  actualValue?: string;
  source: "claude";
};

type InvoiceLineDraft = {
  id: string;
  feeType: string;
  description: string;
  unitCount: number;
  unitRateCents: number;
  totalCents: number;
};

/**
 * Optional second-pass anomaly scan using Gemini (invoice lines must include ids).
 * Kept as `billing-anomaly-claude` to avoid renaming call sites.
 */
export async function enrichInvoiceAnomaliesWithClaude(args: {
  invoiceNumber: string;
  merchantName: string;
  periodStart: Date;
  periodEnd: Date;
  lines: InvoiceLineDraft[];
  sourceContext: Record<string, unknown>;
}): Promise<ClaudeBillingFlag[]> {
  const model = getGeminiModel();
  if (!model) {
    return [];
  }

  const prompt = `You are a billing auditor for a 3PL warehouse invoice.
Flag only supported anomaly types when evidence exists in the JSON: 
QUANTITY_MISMATCH, VACATED_BIN_STORAGE, RATE_MISMATCH, DUPLICATE_CHARGE, UNUSUAL_TOTAL.
Return JSON: { "flags": ClaudeBillingFlag[] } where each flag has:
lineId (invoice line id if applicable, else omit), severity, type, description, expectedValue?, actualValue?

Invoice:
${JSON.stringify(
  {
    invoiceNumber: args.invoiceNumber,
    merchantName: args.merchantName,
    periodStart: args.periodStart.toISOString(),
    periodEnd: args.periodEnd.toISOString(),
    lines: args.lines,
    source: args.sourceContext,
  },
  null,
  2,
)}`;

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: "user", content: prompt }],
      maxOutputTokens: 2048,
    });

    const parsed = parseJsonObject<{ flags: ClaudeBillingFlag[] }>(text);
    return (parsed.flags ?? []).map((f) => ({
      ...f,
      source: "claude" as const,
    }));
  } catch {
    return [];
  }
}

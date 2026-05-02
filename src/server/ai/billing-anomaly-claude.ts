import { DEFAULT_CLAUDE_MODEL, getAnthropic } from "@/server/ai/client";
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
 * Optional second-pass anomaly scan using Claude (invoice lines must include ids).
 */
export async function enrichInvoiceAnomaliesWithClaude(args: {
  invoiceNumber: string;
  merchantName: string;
  periodStart: Date;
  periodEnd: Date;
  lines: InvoiceLineDraft[];
  sourceContext: Record<string, unknown>;
}): Promise<ClaudeBillingFlag[]> {
  const client = getAnthropic();
  if (!client) {
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
    const completion = await client.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const block = completion.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return [];
    }
    const parsed = parseJsonObject<{ flags: ClaudeBillingFlag[] }>(block.text);
    return (parsed.flags ?? []).map((f) => ({
      ...f,
      source: "claude" as const,
    }));
  } catch {
    return [];
  }
}

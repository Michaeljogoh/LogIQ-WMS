import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_CLAUDE_MODEL, getAnthropic } from "@/server/ai/client";
import { buildMerchantChatContext } from "@/server/ai/merchant-chat-context";

export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = session.user as {
    systemRole?: string | null;
    accountId?: string | null;
    merchantId?: string | null;
  };

  if (
    user.systemRole !== "MERCHANT_OWNER" &&
    user.systemRole !== "MERCHANT_USER" &&
    user.systemRole !== "PLATFORM_ADMIN"
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!user.accountId || !user.merchantId) {
    return new Response("Merchant session required", { status: 403 });
  }

  const anthropic = getAnthropic();
  if (!anthropic) {
    return new Response("AI not configured", { status: 503 });
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = (await req.json()) as { messages?: ChatMessage[] };
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m): m is ChatMessage =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string",
  );
  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return new Response("Last message must be from user", { status: 400 });
  }

  const context = await buildMerchantChatContext(db, {
    accountId: user.accountId,
    merchantId: user.merchantId,
  });

  const system = `You are LogIQ, a concise assistant for a merchant using LogIQ WMS.
Use ONLY the JSON context below plus the conversation. If the answer is not in the context, say you do not have that data.
Do not invent numbers. Keep answers short and actionable.

CONTEXT:
${context}`;

  const stream = anthropic.messages.stream({
    model: DEFAULT_CLAUDE_MODEL,
    max_tokens: 4096,
    system,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(enc.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Msg = { role: "user" | "assistant"; content: string };

export default function Page() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) {
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/merchant-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        const err = await res.text();
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${err || res.statusText}` },
        ]);
        return;
      }
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let full = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          full += dec.decode(value, { stream: true });
          setStreaming(full);
        }
      }
      setMessages((m) => [...m, { role: "assistant", content: full }]);
      setStreaming("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Merchant chat</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about your orders, inventory, and invoices. Answers use
          a live snapshot of your portal data.
        </p>
      </div>
      <Card className="min-h-[420px]">
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-lg bg-muted px-3 py-2 text-sm"
                    : "mr-8 rounded-lg border px-3 py-2 text-sm"
                }
              >
                {m.content}
              </div>
            ))}
            {streaming ? (
              <div className="mr-8 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                {streaming}
                <span className="inline-block h-4 w-1 animate-pulse bg-primary" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How many orders shipped this week?"
              className="min-h-24"
              disabled={busy}
            />
            <Button
              type="button"
              className="min-h-11 shrink-0"
              disabled={busy || !input.trim()}
              onClick={() => void send()}
            >
              {busy ? "Sending…" : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

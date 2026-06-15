"use client";

import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import {
  SettingsFilterBar,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How many orders shipped this week?",
  "Which SKUs are low on stock?",
  "What was my latest invoice total?",
];

export default function Page() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value || busy) return;

    const next: Msg[] = [...messages, { role: "user", content: value }];
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
          const { done, value: chunk } = await reader.read();
          if (done) break;
          full += dec.decode(chunk, { stream: true });
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
    <SettingsPage>
      <PageHeader
        description="Ask questions about your orders, inventory, and invoices. Answers use a live snapshot of your portal data."
        title="LogIQ chat"
      />

      <SettingsPanel className="flex min-h-[32rem] flex-col">
        <SettingsPanelHeader
          description="Merchant-scoped AI assistant powered by your fulfillment data."
          icon={Bot}
          title="Conversation"
        />
        <SettingsPanelBody className="flex flex-1 flex-col gap-4">
          <div className="portal-chat-messages flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && !streaming ? (
              <div className="portal-chat-empty flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-6" aria-hidden />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">Ask LogIQ anything</p>
                  <p className="text-sm text-muted-foreground">
                    Try a suggestion below or type your own question.
                  </p>
                </div>
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div
                className={cn(
                  "portal-chat-bubble max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "portal-chat-bubble--user ml-auto"
                    : "portal-chat-bubble--assistant mr-auto",
                )}
                key={`${i}-${m.role}`}
              >
                {m.content}
              </div>
            ))}

            {streaming ? (
              <div className="portal-chat-bubble portal-chat-bubble--assistant mr-auto max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                {streaming}
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
              </div>
            ) : null}
          </div>

          <SettingsFilterBar className="flex-col items-stretch gap-3 border-0 bg-transparent p-0 shadow-none">
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  className="h-auto min-h-9 whitespace-normal py-1.5 text-left text-xs"
                  disabled={busy}
                  key={s}
                  onClick={() => void send(s)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {s}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Textarea
                className="min-h-24 flex-1 resize-none"
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="e.g. How many open orders do I have?"
                value={input}
              />
              <Button
                className="min-h-11 shrink-0"
                disabled={busy || !input.trim()}
                onClick={() => void send()}
                type="button"
              >
                <Send className="size-4" aria-hidden />
                {busy ? "Sending…" : "Send"}
              </Button>
            </div>
          </SettingsFilterBar>
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}

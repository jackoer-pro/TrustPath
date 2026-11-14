"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Bot, FlaskConical, WifiOff } from "lucide-react";
import type { ChatCard } from "@/lib/ai/tools";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** ISO time, used to merge polled simulation messages into the thread in order. */
  at: string;
  /** e.g. "Simulated compromised agent" (invariant 11). */
  label?: string;
  cards?: ChatCard[];
  offline?: boolean;
  /** Local error bubble — never sent back to the server as history. */
  error?: boolean;
};

const suggestions = ["Show my balance", "Pay a bill", "Move money to savings", "I think I've been scammed"];

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-trust-bg text-trust">
        <Bot className="h-4 w-4" aria-hidden />
      </span>
      <div className="max-w-[85%] rounded-2xl bg-surface px-4 py-2 shadow-sm">{children}</div>
    </div>
  );
}

export function ChatThread({
  messages,
  pending,
  onSuggestion,
  renderCard,
}: {
  messages: ChatMsg[];
  pending: boolean;
  onSuggestion: (text: string) => void;
  renderCard: (card: ChatCard) => ReactNode;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Block body on purpose: scrollIntoView() returns a Promise in current Chrome, and an effect may only return a cleanup function.
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, pending]);

  return (
    <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto p-4">
      <AssistantBubble>Hi Alex, how can I help?</AssistantBubble>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm text-navy hover:bg-trust-bg"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <p className="max-w-[85%] animate-rise rounded-2xl bg-navy px-4 py-2 text-white">{m.content}</p>
          </div>
        ) : (
          <div key={m.id} className="animate-rise space-y-3">
            <AssistantBubble>
              <p className={m.error ? "text-risk-critical" : ""}>{m.content}</p>
              {m.label && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-risk-critical-bg px-2 py-0.5 text-xs text-risk-critical">
                  <FlaskConical className="h-3 w-3" aria-hidden />
                  {m.label}
                </span>
              )}
              {m.offline && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-xs text-muted">
                  <WifiOff className="h-3 w-3" aria-hidden />
                  Offline assistant
                </span>
              )}
            </AssistantBubble>
            {m.cards?.map((c) => <div key={c.type === "receipt" ? c.action.id : c.id}>{renderCard(c)}</div>)}
          </div>
        ),
      )}

      {pending && (
        <AssistantBubble>
          <span className="flex items-center gap-2 text-muted" role="status">
            Checking
            <span className="flex gap-1" aria-hidden>
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
            <span className="sr-only">…</span>
          </span>
        </AssistantBubble>
      )}
      <div ref={end} />
    </div>
  );
}

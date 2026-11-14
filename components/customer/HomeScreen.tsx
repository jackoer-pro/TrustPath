"use client";

import { Bot, SendHorizontal } from "lucide-react";
import { AccountSummary } from "./AccountSummary";
import { useCustomerState } from "./useCustomerState";

const suggestions = ["Show my balance", "Pay a bill", "Move money to savings", "I think I've been scammed"];

export function HomeScreen() {
  const { state, error } = useCustomerState();

  return (
    <>
      <div className="shrink-0 pb-4">
        {error && !state ? (
          <p className="px-4 text-sm text-muted">Can&apos;t load your accounts right now.</p>
        ) : (
          <AccountSummary accounts={state?.accounts ?? null} />
        )}
        {error && state && <p className="px-4 pt-2 text-xs text-muted">Reconnecting…</p>}
      </div>

      {/* ponytail: static chat until Unit 11 wires the assistant. */}
      <section aria-label="Chat with TrustPath" className="flex min-h-0 flex-1 flex-col bg-sunken">
        <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-trust-bg text-trust">
              <Bot className="h-4 w-4" aria-hidden />
            </span>
            <p className="rounded-2xl bg-surface px-4 py-2 shadow-sm">Hi Alex, how can I help?</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled
                className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm text-navy disabled:opacity-60"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <form className="flex shrink-0 items-center gap-2 border-t border-line bg-surface p-3">
          <input
            disabled
            aria-label="Message TrustPath"
            placeholder="Message TrustPath…"
            className="h-11 flex-1 rounded-md bg-sunken px-3 text-base placeholder:text-muted disabled:opacity-60"
          />
          <button
            type="submit"
            disabled
            aria-label="Send"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white disabled:opacity-50"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </form>
      </section>
    </>
  );
}

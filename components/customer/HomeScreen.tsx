"use client";

import { useState } from "react";
import { Bot, SendHorizontal } from "lucide-react";
import { formatAUD } from "@/lib/money";
import type { PreparedAction } from "@/lib/banking/actions";
import { AccountSummary } from "./AccountSummary";
import { DevPanel } from "./DevPanel";
import { PinDialog, type ApproveResult } from "./PinDialog";
import { TrustReceipt, type ReceiptStatus } from "./TrustReceipt";
import { useCustomerState } from "./useCustomerState";

const suggestions = ["Show my balance", "Pay a bill", "Move money to savings", "I think I've been scammed"];

type Local = { status?: ReceiptStatus; completedAt?: string; note?: string };

export function HomeScreen() {
  const { state, error, setBalances } = useCustomerState();
  const [receipts, setReceipts] = useState<PreparedAction[]>([]);
  const [local, setLocal] = useState<Record<string, Local>>({});
  const [pinFor, setPinFor] = useState<PreparedAction | null>(null);

  const patch = (id: string, l: Local) => setLocal((prev) => ({ ...prev, [id]: { ...prev[id], ...l } }));

  /** Local outcome first (instant), then the polled DB status (expiry, cancellation), then the prepared status. */
  const statusOf = (a: PreparedAction) => {
    const polled = state?.actions.find((x) => x.id === a.id);
    return {
      status: (local[a.id]?.status ?? polled?.status ?? a.status) as ReceiptStatus,
      completedAt: local[a.id]?.completedAt ?? polled?.completedAt,
    };
  };

  function approved(r: ApproveResult) {
    patch(r.action.id, { status: "completed", completedAt: r.action.completedAt });
    setBalances(r.accounts);
    setPinFor(null);
  }

  function refused(code: string, message: string) {
    if (!pinFor) return;
    patch(pinFor.id, code === "TOO_MANY_ATTEMPTS" ? { status: "cancelled", note: message } : { note: message });
    setPinFor(null);
  }

  async function cancel(a: PreparedAction) {
    const body = await fetch(`/api/actions/${a.id}/cancel`, { method: "POST" })
      .then((r) => r.json())
      .catch(() => null);
    patch(a.id, body?.ok ? { status: "cancelled" } : { note: body?.error.message ?? "We couldn't reach the bank. Try again." });
  }

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

      {/* ponytail: static greeting until Unit 11 wires the assistant. */}
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

          {process.env.NODE_ENV !== "production" && <DevPanel onPrepared={(a) => setReceipts((r) => [...r, a])} />}

          {receipts.map((a) => (
            <TrustReceipt
              key={a.id}
              action={a}
              {...statusOf(a)}
              note={local[a.id]?.note}
              onApprove={() => setPinFor(a)}
              onCancel={() => cancel(a)}
            />
          ))}
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

      <PinDialog
        actionId={pinFor?.id ?? null}
        payloadHash={pinFor?.payloadHash ?? ""}
        summary={pinFor ? `${formatAUD(pinFor.amountCents)} to ${pinFor.toName} from ${pinFor.fromName}` : ""}
        onClose={() => setPinFor(null)}
        onApproved={approved}
        onRefused={refused}
      />
    </>
  );
}

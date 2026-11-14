"use client";

import { useState } from "react";
import { formatAUD } from "@/lib/money";
import type { PreparedAction } from "@/lib/banking/actions";
import { AccountSummary } from "./AccountSummary";
import { ChatInput } from "./ChatInput";
import { ChatThread, type ChatMsg } from "./ChatThread";
import { PinDialog, type ApproveResult } from "./PinDialog";
import { TrustReceipt, type ReceiptStatus } from "./TrustReceipt";
import { useCustomerState } from "./useCustomerState";

const HISTORY_LIMIT = 12;
const OFFLINE_ERROR = "I couldn't reach the bank just now. Please try again.";

type Local = { status?: ReceiptStatus; completedAt?: string; note?: string };

export function HomeScreen() {
  const { state, error, setBalances } = useCustomerState();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState(false);
  const [local, setLocal] = useState<Record<string, Local>>({});
  const [pinFor, setPinFor] = useState<PreparedAction | null>(null);

  const patch = (id: string, l: Local) => setLocal((prev) => ({ ...prev, [id]: { ...prev[id], ...l } }));

  async function send(text: string) {
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text };
    const history = [...messages, userMsg]
      .filter((m) => !m.error)
      .slice(-HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, userMsg]);
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const body = await res.json();
      const reply: ChatMsg = body.ok
        ? { id: crypto.randomUUID(), role: "assistant", content: body.data.reply, cards: body.data.cards, offline: body.data.offline }
        : { id: crypto.randomUUID(), role: "assistant", content: OFFLINE_ERROR, error: true };
      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: OFFLINE_ERROR, error: true }]);
    } finally {
      setPending(false);
    }
  }

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
    patch(a.id, body?.ok ? { status: "cancelled" } : { note: body?.error.message ?? OFFLINE_ERROR });
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

      <section aria-label="Chat with TrustPath" className="flex min-h-0 flex-1 flex-col bg-sunken">
        <ChatThread
          messages={messages}
          pending={pending}
          onSuggestion={send}
          renderCard={(a) => (
            <TrustReceipt
              action={a}
              {...statusOf(a)}
              note={local[a.id]?.note}
              onApprove={() => setPinFor(a)}
              onCancel={() => cancel(a)}
            />
          )}
        />
        <ChatInput disabled={pending} onSend={send} />
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

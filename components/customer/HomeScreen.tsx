"use client";

import { useRef, useState } from "react";
import { formatAUD } from "@/lib/money";
import type { PreparedAction } from "@/lib/banking/actions";
import type { CustomerState } from "@/lib/banking/state";
import { AccountSummary } from "./AccountSummary";
import { AlertBanner } from "./AlertBanner";
import { CoachingCard } from "./CoachingCard";
import { EmergencyCard } from "./EmergencyCard";
import { SourcesCard } from "./SourcesCard";
import { ChatInput } from "./ChatInput";
import { ChatThread, type ChatMsg } from "./ChatThread";
import { PinDialog, type ApproveResult } from "./PinDialog";
import { ShieldCard } from "./ShieldCard";
import { TrustReceipt, type ReceiptStatus } from "./TrustReceipt";
import { useCustomerState } from "./useCustomerState";

const HISTORY_LIMIT = 12;
const OFFLINE_ERROR = "I couldn't reach the bank just now. Please try again.";
// Local, not LLM (spec 19): instant, identical online and offline, and sent as history with the next turn.
const DENIED_REPLY = "Thanks for telling us. I've kept your card locked. Did anything else happen, like someone asking for a code?";
const CONFIRMED_REPLY = "Thanks. Your card stays locked until our team reviews it.";

type Local = { status?: ReceiptStatus; completedAt?: string; note?: string };
type PolledAction = CustomerState["actions"][number];

/** A blocked hijack attempt from the demo's simulated compromised agent, shown as a labelled assistant message. */
function simulationMessage(a: PolledAction, fromName: string): ChatMsg {
  const action: PreparedAction = {
    id: a.id,
    type: "transfer",
    status: "blocked",
    riskLevel: a.riskLevel,
    reasons: a.reasons,
    amountCents: a.amountCents,
    description: a.description,
    payloadHash: a.payloadHash,
    origin: "simulated_compromised_agent",
    fromAccountId: a.fromAccountId,
    fromName,
    toName: a.recipientLabel ?? "an unknown recipient",
    recipientKind: "unknown",
    checks: { requestedByYou: false, recipientKnown: false, fundsAvailable: true },
    createdAt: a.createdAt,
    expiresAt: a.expiresAt,
  };
  return {
    id: `sim-${a.id}`,
    role: "assistant",
    at: a.createdAt,
    label: "Simulated compromised agent",
    content: `Something tried to send ${formatAUD(a.amountCents)} to ${action.toName} without you asking. I blocked it.`,
    cards: [{ type: "receipt", action }],
  };
}

export function HomeScreen() {
  const { state, error, setBalances } = useCustomerState();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState(false);
  const [local, setLocal] = useState<Record<string, Local>>({});
  const [pinFor, setPinFor] = useState<PreparedAction | null>(null);
  const [answered, setAnswered] = useState<string[]>([]);
  const [alertBusy, setAlertBusy] = useState(false);
  const [alertError, setAlertError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Newest unanswered card alert; hidden optimistically once answered (the next poll confirms).
  const alert = state?.notifications.find((n) => n.kind === "card_alert" && !answered.includes(n.id));

  async function answer(response: "confirmed" | "denied") {
    if (!alert) return;
    setAlertBusy(true);
    setAlertError(undefined);
    const body = await fetch(`/api/notifications/${alert.id}/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ response }),
    })
      .then((r) => r.json())
      .catch(() => null);
    setAlertBusy(false);
    // ALREADY_ANSWERED means another tab answered it: hide it too.
    if (!body?.ok && body?.error?.code !== "ALREADY_ANSWERED") {
      setAlertError(body?.error?.message ?? OFFLINE_ERROR);
      return;
    }
    setAnswered((a) => [...a, alert.id]);
    if (!body.ok) return;
    const content = response === "denied" ? DENIED_REPLY : CONFIRMED_REPLY;
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content, at: new Date().toISOString() }]);
    if (response === "denied") inputRef.current?.focus();
  }

  const patch = (id: string, l: Local) => setLocal((prev) => ({ ...prev, [id]: { ...prev[id], ...l } }));

  async function send(text: string) {
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text, at: new Date().toISOString() };
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
        ? { id: crypto.randomUUID(), role: "assistant", content: body.data.reply, cards: body.data.cards, offline: body.data.offline, at: new Date().toISOString() }
        : { id: crypto.randomUUID(), role: "assistant", content: OFFLINE_ERROR, error: true, at: new Date().toISOString() };
      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: OFFLINE_ERROR, error: true, at: new Date().toISOString() }]);
    } finally {
      setPending(false);
    }
  }

  // Derived from the 2 s poll (no effect needed); never sent to the model as history.
  const simulated = (state?.actions ?? [])
    .filter((a) => a.origin === "simulated_compromised_agent")
    .map((a) => simulationMessage(a, state?.accounts.find((x) => x.id === a.fromAccountId)?.name ?? "Everyday"));
  const thread = [...messages, ...simulated].sort((x, y) => x.at.localeCompare(y.at));

  /** Local outcome first (instant), then the polled DB status (expiry, cancellation), then the prepared status. */
  /** CoachGuard can hold a waiting payment later: show the latest stored reasons and risk, not only the first ones. */
  const withPolled = (a: PreparedAction): PreparedAction => {
    const polled = state?.actions.find((x) => x.id === a.id);
    return polled ? { ...a, reasons: polled.reasons, riskLevel: polled.riskLevel } : a;
  };

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
        {alert && <AlertBanner title={alert.title} body={alert.body} busy={alertBusy} error={alertError} onAnswer={answer} />}
        {error && !state ? (
          <p className="px-4 text-sm text-muted">Can&apos;t load your accounts right now.</p>
        ) : (
          <AccountSummary accounts={state?.accounts ?? null} />
        )}
        {error && state && <p className="px-4 pt-2 text-xs text-muted">Reconnecting…</p>}
      </div>

      <section aria-label="Chat with TrustPath" className="flex min-h-0 flex-1 flex-col bg-sunken">
        <ChatThread
          messages={thread}
          pending={pending}
          onSuggestion={send}
          renderCard={(c) =>
            c.type === "shield" ? (
              <ShieldCard card={c} />
            ) : c.type === "emergency" ? (
              <EmergencyCard card={c} />
            ) : c.type === "sources" ? (
              <SourcesCard card={c} />
            ) : c.type === "coaching" ? (
              <CoachingCard card={c} />
            ) : (
              <TrustReceipt
                action={withPolled(c.action)}
                {...statusOf(c.action)}
                note={local[c.action.id]?.note}
                onApprove={() => setPinFor(c.action)}
                onCancel={() => cancel(c.action)}
              />
            )
          }
        />
        <ChatInput disabled={pending} onSend={send} inputRef={inputRef} />
      </section>

      <PinDialog
        actionId={pinFor?.id ?? null}
        payloadHash={pinFor?.payloadHash ?? ""}
        summary={
          !pinFor
            ? ""
            : pinFor.type === "purchase"
              ? `${formatAUD(pinFor.amountCents)} at ${pinFor.toName} with debit card •••• ${pinFor.cardLastFour}`
              : `${formatAUD(pinFor.amountCents)} to ${pinFor.toName} from ${pinFor.fromName}`
        }
        onClose={() => setPinFor(null)}
        onApproved={approved}
        onRefused={refused}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { OpsState } from "@/lib/ops/state";

type Props = { incident: OpsState["incidents"][number]; customer: OpsState["customer"]; staffKey: string };

/** Bank staff only: the demo key goes in x-demo-key; the server checks it. */
export function StaffActions({ incident: i, customer, staffKey }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [confirming, setConfirming] = useState(false);

  const resolvable = i.type !== "injection_blocked";
  const done = i.status === "investigated";
  const locked = customer.cards.filter((c) => c.status !== "active" && !c.reportedLost).map((c) => `•••• ${c.lastFour}`);

  async function act(kind: "review" | "resolve") {
    setBusy(true);
    setMessage(undefined);
    const body = await fetch(`/api/ops/incidents/${i.id}/${kind}`, { method: "POST", headers: { "x-demo-key": staffKey } })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (!body?.ok) return setMessage({ ok: false, text: body?.error?.message ?? "Couldn't reach the server. Try again." });
    setMessage({
      ok: true,
      text:
        kind === "review"
          ? "Marked investigated."
          : `Restrictions lifted${body.data.cardsUnlocked.length ? `, card ${body.data.cardsUnlocked.map((c: string) => `•••• ${c}`).join(", ")} unlocked` : ""}. ${body.data.casesClosed} ${body.data.casesClosed === 1 ? "case" : "cases"} closed.`,
    });
  }

  const disabled = busy || !staffKey;
  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={disabled || done} onClick={() => act("review")}>
          Mark investigated
        </Button>
        {resolvable && (
          <Button disabled={disabled || (done && !customer.outgoingPaused && !locked.length)} onClick={() => setConfirming(true)}>
            Lift restrictions &amp; unlock card
          </Button>
        )}
      </div>
      {!staffKey && <p className="mt-2 text-xs text-muted">Enter the staff key to act.</p>}
      {message && (
        <p role="status" className={`mt-2 text-sm ${message.ok ? "text-risk-low" : "text-risk-critical"}`}>
          {message.text}
        </p>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)} labelledBy="resolve-title">
        <h2 id="resolve-title" className="text-lg font-semibold">
          Lift restrictions?
        </h2>
        <p className="mt-2 text-sm">
          This {locked.length ? `unlocks card ${locked.join(", ")} and ` : ""}lifts all restrictions for {customer.name}. Only do this after
          you&apos;ve confirmed the account is safe.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)} data-autofocus>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => act("resolve")}>
            Lift and unlock
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
